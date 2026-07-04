// Pautkan nama perawi dalam isnad (hadith_narrators.narrator_id) macam mausu'ah —
// naikkan kadar padanan dari ~30% dengan: (1) padanan UNIK (nama penuh/shuhra/kunya),
// (2) disambiguate ITERATIF guna graf guru-murid (narrator_relations) sbg sauh.
// PRINSIP: ragu = JANGAN paut (senama ≠ semestinya sama orang).
// Tulis ke corpus.db LOKAL sahaja (0 writes Turso). Idempoten.
//   node scripts/link-isnad.mjs          # dry (ukur sahaja)
//   node scripts/link-isnad.mjs --write  # kemas narrator_id
import { createClient } from "@libsql/client";
const WRITE = process.argv.includes("--write");
const db = createClient({ url: process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db", authToken: process.env.TURSO_AUTH_TOKEN });

const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "")
  .replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه")
  .replace(/\s+/g, " ").trim();

console.log("→ Muat perawi + bina indeks unik…");
const full = new Map(), shu = new Map(), kun = new Map();
const add = (m, k, id) => { if (!k) return; const s = m.get(k); if (s) s.add(id); else m.set(k, new Set([id])); };
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id,name_search,shuhra,kunya FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const row of r.rows) { cur = Number(row.id); add(full, norm(row.name_search), cur); add(shu, norm(row.shuhra), cur); add(kun, norm(row.kunya), cur); }
}
const uniq = (m, k) => { const s = m.get(k); return s && s.size === 1 ? [...s][0] : null; };
const cands = (k) => full.get(k) || shu.get(k) || null;

// Token GENERIK/relational — BUKAN identiti: jangan sesekali paut ikut nama
// (kes buruk lama: ابيه→"أبي مولى عباس" ×120, غيره→perawi "غيرة" ×52).
// Relational (ابيه/جده…) diselesaikan skrip link-relational ikut nasab jiran.
const GENERIC = new Set([
  "ابيه", "ابيها", "جده", "جدها", "جدي", "جدته", "جدتي", "امه", "امها", "امي",
  "عمه", "عمها", "عمي", "خاله", "خالها", "خالي", "ابنه", "ابنته",
  "غيره", "وغيره", "غيرهما", "بعضهم", "بعض", "رجل", "رجلا", "رجلين", "امراه",
  "شيخ", "شيخا", "اخر", "آخر", "قوم", "ناس", "اناس", "جماعه", "اصحابه", "اصحابنا",
  "فلان", "عده", "غير واحد", "مولاه", "مولي", "ثقه", "الثقه", "خادم", "اعرابي", "صاحب",
]);

// Indeks AWALAN ber-بن (kes المُهْمَل — Kamus al-Ghouri hlm 547): "سفيان" sahaja
// boleh jadi الثوري ATAU ابن عيينة → calon = semua "سفيان بن …", biar graf
// guru-murid tentukan. Susun name_search sekali; cari julat via binary search.
const sortedNames = [...full.entries()].map(([k, s]) => [k, s]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
function prefixCands(nm) {
  const pre = nm + " بن ";
  let lo = 0, hi = sortedNames.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedNames[mid][0] < pre) lo = mid + 1; else hi = mid; }
  const out = new Set();
  for (let i = lo; i < sortedNames.length && sortedNames[i][0].startsWith(pre); i++)
    for (const id of sortedNames[i][1]) { out.add(id); if (out.size > 120) return null; } // terlalu generik (محمد…) → jangan teka
  return out.size ? out : null;
}

console.log("→ Muat narrator_relations…");
const rel = new Set();
let roff = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT teacher_id,student_id FROM narrator_relations ORDER BY rowid LIMIT 5000 OFFSET ?", args: [roff] });
  if (!r.rows.length) break;
  for (const row of r.rows) rel.add(Number(row.teacher_id) * 1e8 + Number(row.student_id));
  roff += r.rows.length;
  if (r.rows.length < 5000) break;
}
const linked = (a, b) => a && b && (rel.has(a * 1e8 + b) || rel.has(b * 1e8 + a));

console.log("→ Muat hadith_narrators…");
const rows = [];
cur = -1;
for (;;) {
  const r = await db.execute({ sql: "SELECT rowid AS rid,hadith_id,chain_no,position,raw_name,narrator_id FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 8000", args: [cur] });
  if (!r.rows.length) break;
  for (const row of r.rows) { cur = Number(row.rid); rows.push({ rid: cur, h: Number(row.hadith_id), ch: Number(row.chain_no || 0), po: Number(row.position), nm: norm(row.raw_name), nid: row.narrator_id == null ? null : Number(row.narrator_id) }); }
}
const key = (r) => `${r.h}|${r.ch}|${r.po}`;
const at = new Map();
for (const r of rows) if (r.nid != null) at.set(key(r), r.nid);
const before = [...at.values()].length;

console.log("→ Resolusi iteratif…");
const updates = [];
const setLink = (r, id) => { r.nid = id; at.set(key(r), id); updates.push([id, r.rid]); };
let pass = 0, changed = true;
while (changed && pass < 6) {
  changed = false; pass++;
  let uni = 0, ctx = 0;
  for (const r of rows) {
    if (r.nid != null || !r.nm || GENERIC.has(r.nm)) continue;
    // KETEPATAN-DAHULU (jangan tertukar orang):
    // Tier 1 — nama PENUH unik = identiti pasti (nasab lengkap).
    const f = uniq(full, r.nm);
    if (f) { setLink(r, f); uni++; changed = true; continue; }
    // Tier 2 — calon (penuh/shuhra/kunya) yg DISOKONG graf guru-murid jiran yg dah dipaut.
    //          shuhra/kunya TAK dipaut tanpa sokongan konteks (elak سفيان→orang salah).
    const cs = new Set([...(full.get(r.nm) || []), ...(shu.get(r.nm) || []), ...(kun.get(r.nm) || [])]);
    // Tier 2b — nama ringkas/kabur: tambah calon awalan ber-بن (سفيان → سفيان بن …).
    if (!cs.size) { const pc = prefixCands(r.nm); if (pc) for (const id of pc) cs.add(id); }
    if (cs.size) {
      const prev = at.get(`${r.h}|${r.ch}|${r.po - 1}`), next = at.get(`${r.h}|${r.ch}|${r.po + 1}`);
      // PERSILANGAN dulu: calon mesti berhubung dgn SEMUA jiran terpaut (kes سفيان:
      // مسعر guru dua-dua Sufyan, tapi ابن ابي عمر murid ابن عيينة shj → tunggal).
      // Fallback: union-unik (berhubung dgn mana-mana satu jiran).
      if (prev != null || next != null) {
        const both = [...cs].filter((x) => (prev == null || linked(x, prev)) && (next == null || linked(x, next)));
        const ok = both.length === 1 ? both : [...cs].filter((x) => linked(x, prev) || linked(x, next));
        if (ok.length === 1) { setLink(r, ok[0]); ctx++; changed = true; }
      }
    }
    // else: RAGU → kekal tak dipaut (nama papar teks biasa).
  }
  console.log(`  pass ${pass}: +unik ${uni}, +konteks ${ctx}`);
}
const after = before + updates.length;
const tot = rows.length;
console.log(`\n  SEBELUM: ${before} (${(before / tot * 100).toFixed(0)}%)  →  SELEPAS: ${after} (${(after / tot * 100).toFixed(0)}%)  [+${updates.length}]`);

if (!WRITE) { console.log("\n(dry — guna --write utk kemas corpus.db)"); process.exit(0); }
console.log("→ Menulis ke corpus.db (LOKAL)…");
for (let i = 0; i < updates.length; i += 500) {
  await db.batch(updates.slice(i, i + 500).map(([id, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [id, rid] })), "write");
  process.stdout.write(`\r  ${Math.min(i + 500, updates.length)}/${updates.length}`);
}
console.log("\n✓ Siap. (corpus.db lokal; sync Turso berasingan via turso-sync.sh berpengawal.)");
db.close();
