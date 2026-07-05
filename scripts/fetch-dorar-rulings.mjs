// Ambil hukm/takhrij dorar utk hadis KITA via proxy CF Worker (/api/dorar) — IP awan
// tak disekat. Padan kitab-sumber (is_primary), simpan SEMUA jalur (kepelbagaian sanad).
// RESUMABLE: checkpoint fail; hormat kadar dorar (DELAY ms). Kitab utama dulu.
//   node --env-file=.env.local scripts/fetch-dorar-rulings.mjs [--limit N] [--book ID] [--delay 1500] [--write]
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { normalizeArabic } from "./lib/arabic.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write");
const LIMIT = Number(arg("--limit", "0")) || 0;
const ONLY_BOOK = arg("--book", "");
const MAJOR_ONLY = process.argv.includes("--major-only"); // hanya buku UTAMA (lengkap) — elak tanda hadis tak lengkap 'selesai'
const DELAY = Number(arg("--delay", "1500"));
const KEY = process.env.DORAR_KEY;
const BASE = process.env.DORAR_PROXY ?? "https://syaifulizhan.my/api/dorar";
if (!KEY) { console.error("DORAR_KEY hilang (.env.local)"); process.exit(1); }

const db = createClient({ url: "file:./data/corpus.db" });
const CK = "scripts/_dorar-checkpoint.json";
const ck = existsSync(CK) ? JSON.parse(readFileSync(CK, "utf8")) : { done: [], lastId: 0 };
const doneSet = new Set(ck.done);

// ── susunan kitab MUKTABAR: Kutub Sittah (Bukhari→Muslim→Abu Dawud→Tirmidhi→Nasa'i
// →Ibn Majah) → Muwatta → Ahmad → Darimi → koleksi lain → 924 kitab kecil ──
const MAJOR = [900003, 900007, 900001, 900009, 900008, 900005, 900006, 900002, 900004, 900010, 900011, 900012, 900013, 900014, 900015, 900016, 900017];
const bookName = new Map((await db.execute("SELECT id, title_ar FROM books")).rows.map((r) => [Number(r.id), String(r.title_ar ?? "")]));

// ── frasa matn distinktif (buang isnad) ──
function matnQuery(matnAr) {
  let s = normalizeArabic(matnAr);
  const i = s.lastIndexOf("وسلم");            // selepas صلى الله عليه وسلم (penanda mula matn)
  if (i >= 0 && i < s.length - 12) s = s.slice(i + 4).trim();
  else { const w = s.split(" "); s = w.slice(Math.min(12, Math.max(0, w.length - 6))).join(" "); }
  return s.split(" ").filter(Boolean).slice(0, 9).join(" ");
}
const nb = (s) => normalizeArabic(s);

async function fetchDorar(skey) {
  const url = `${BASE}?key=${encodeURIComponent(KEY)}&skey=${encodeURIComponent(skey)}`;
  for (let att = 0; att < 3; att++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return await r.text();
      if (r.status === 429 || r.status === 502) { await sleep(3000 * (att + 1)); continue; }
      return null;
    } catch { await sleep(2000 * (att + 1)); }
  }
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// parser (seiras parse-dorar.mjs)
const strip = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
function parse(html, ourBookNorm) {
  html = html.replace(/\\\//g, "/").replace(/\\n/g, "\n").replace(/\\"/g, '"');
  try { const j = JSON.parse(html); html = j?.ahadith?.result ?? html; } catch {}
  const fld = (b, l) => { const m = b.match(new RegExp(`<span class="info-subtitle">${l}:<\\/span>([\\s\\S]*?)(?=<span class="info-subtitle">|<\\/div>)`)); return m ? strip(m[1]).replace(/^\[|\]$/g, "") : null; };
  const out = [];
  html.split("--------------").filter((b) => b.includes("hadith-info")).forEach((b, i) => {
    const source_book = fld(b, "المصدر");
    const muhaddith = fld(b, "المحدث");
    if (!source_book && !muhaddith) return;
    out.push({ rawi: fld(b, "الراوي"), muhaddith, source_book, ref: fld(b, "الصفحة أو الرقم"), hukm: fld(b, "خلاصة حكم المحدث"), is_primary: source_book && nb(source_book) === ourBookNorm ? 1 : 0, ord: i + 1 });
  });
  return out;
}

// ── senarai kerja ──
let where = "1=1";
if (ONLY_BOOK) where = `h.book_id=${Number(ONLY_BOOK)}`;
else if (MAJOR_ONLY) where = `h.book_id IN (${MAJOR.join(",")})`;
const rows = (await db.execute({
  sql: `SELECT h.id, h.book_id, h.matn_ar FROM hadiths h WHERE ${where} ORDER BY h.book_id, h.id`,
})).rows.map((r) => ({ id: Number(r.id), book: Number(r.book_id), matn: String(r.matn_ar) }));
rows.sort((a, b) => (MAJOR.indexOf(a.book) + 1 || 999) - (MAJOR.indexOf(b.book) + 1 || 999) || a.book - b.book || a.id - b.id);

let processed = 0, withPrimary = 0, withAny = 0, saved = 0;
for (const h of rows) {
  if (doneSet.has(h.id)) continue;
  if (LIMIT && processed >= LIMIT) break;
  const q = matnQuery(h.matn);
  if (q.length < 8) { doneSet.add(h.id); continue; }
  const body = await fetchDorar(q);
  processed++;
  if (!body) { console.log(`  #${h.id} (${bookName.get(h.book)}): GAGAL fetch`); await sleep(DELAY); continue; }
  const rulings = parse(body, nb(bookName.get(h.book) ?? ""));
  const prim = rulings.filter((r) => r.is_primary);
  if (rulings.length) withAny++;
  if (prim.length) withPrimary++;
  if (processed <= 15 || processed % 50 === 0)
    console.log(`  #${h.id} ${bookName.get(h.book)} q="${q.slice(0,30)}…" → ${rulings.length} hukm, primer ${prim.length}${prim.length ? " ("+prim[0].hukm+")" : ""}`);
  if (WRITE && rulings.length) {
    for (const r of rulings)
      await db.execute({ sql: `INSERT OR IGNORE INTO hadith_ruling (hadith_id,rawi,muhaddith,source_book,ref,hukm,is_primary,ord,fetched_at) VALUES (?,?,?,?,?,?,?,?,?)`,
        args: [h.id, r.rawi, r.muhaddith, r.source_book, r.ref, r.hukm, r.is_primary, r.ord, new Date().toISOString()] });
    saved += rulings.length;
  }
  doneSet.add(h.id); ck.lastId = h.id;
  if (WRITE && processed % 25 === 0) { ck.done = [...doneSet]; writeFileSync(CK, JSON.stringify(ck)); }
  await sleep(DELAY);
}
if (WRITE) { ck.done = [...doneSet]; writeFileSync(CK, JSON.stringify(ck)); }
console.log(`\n${WRITE ? "✓" : "(DRY)"} diproses ${processed} · ada hukm ${withAny} · ada primer ${withPrimary} (${processed?Math.round(withPrimary/processed*100):0}%) · disimpan ${saved} baris`);
console.log(`checkpoint: ${doneSet.size} hadis selesai${WRITE ? " (disimpan "+CK+")" : " (DRY — tak simpan)"}`);
db.close();
