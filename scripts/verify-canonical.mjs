// Stage 2: sahkan peta kanonik silang (1) korpus kita (ikat id) + (2) hawramani (tok syeikh).
// Hanya peta yg disahkan DUA-DUA layak dipaut. Papar bukti. 0 tulisan.
//   node scripts/verify-canonical.mjs
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const STOP = new Set(["بن", "ابن", "ابو", "ابي", "بنت", "ام", "مولي", "ال"]);
const toks = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const map = JSON.parse(readFileSync("data/isnad-canonical.json", "utf8"));
const entries = {};
for (const k of ["safe_companions", "safe_famous", "safe_explicit"]) Object.assign(entries, map[k]);

const db = createClient({ url: "file:./data/corpus.db" });
// indeks korpus: id → tokens(name_search)
const corp = [];
let cur = 0;
for (;;) {
  const r = await db.execute({ sql: "SELECT id,name_ar,name_search FROM narrators WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
  if (!r.rows.length) break;
  for (const x of r.rows) { cur = Number(x.id); const raw = norm(x.name_search).split(" ").filter(Boolean); corp.push({ id: cur, name: x.name_ar || "", t: new Set(toks(x.name_search)), raw }); }
}
console.log(`korpus: ${corp.length} perawi\n`);

// Jaccard token + ism (token pertama) MESTI hadir → utamakan orang itu sendiri,
// bukan keturunan (yg nama-nya lebih panjang, Jaccard rendah).
function jac(a, b) { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.length + b.size - i); }
function bindCorpus(canon) {
  const ct = toks(canon); if (!ct.length) return null;
  const ism = ct[0];
  const cand = [];
  for (const p of corp) {
    const pos = p.raw.indexOf(ism);
    if (pos < 0 || pos > 2) continue;            // ism mesti di awal (izin kunya depan)
    if (pos > 0 && p.raw[pos - 1] === "بن") continue; // didahului بن = moyang/bapa → tolak
    const j = jac(ct, p.t);
    if (j >= 0.5) cand.push({ id: p.id, name: p.name, j });
  }
  cand.sort((a, b) => b.j - a.j);
  if (!cand.length) return null;
  const top = cand[0];
  const ties = cand.filter((c) => Math.abs(c.j - top.j) < 0.06).length; // seri rapat
  return { id: top.id, name: top.name, score: top.j, ties };
}
async function verifyHawramani(canon) {
  const ct = toks(canon);
  try {
    const list = await (await fetch(`https://hadithtransmitters.hawramani.com/wp-json/wp/v2/posts?search=${encodeURIComponent(canon)}&per_page=5&_fields=title`)).json();
    for (const e of (list || [])) {
      const ht = new Set(toks(e.title?.rendered || ""));
      if (ht.has(ct[0]) && jac(ct, ht) >= 0.45) return { ok: true, name: (e.title?.rendered || "").replace(/<[^>]+>/g, "") };
    }
  } catch {}
  return { ok: false };
}

const result = {};
let okBoth = 0;
for (const [short, canon] of Object.entries(entries)) {
  const cb = bindCorpus(canon);
  const hw = await verifyHawramani(canon); await sleep(250);
  const good = cb && cb.ties === 1 && hw.ok;
  if (good) { result[short] = cb.id; okBoth++; }
  console.log(`${good ? "✅" : "⚠️ "} "${short}" → ${canon.slice(0, 34)}`);
  console.log(`     korpus: ${cb ? `#${cb.id} ${cb.name.slice(0, 30)} (skor ${cb.score.toFixed(2)}, ties ${cb.ties})` : "TAK JUMPA"} | hawramani: ${hw.ok ? "✓ " + hw.name.slice(0, 28) : "✗"}`);
}
writeFileSync("data/isnad-canonical-verified.json", JSON.stringify(result, null, 1));
console.log(`\n✓ ${okBoth}/${Object.keys(entries).length} disahkan DUA-DUA → data/isnad-canonical-verified.json (short→id korpus)`);
db.close();
