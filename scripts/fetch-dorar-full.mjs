// Pengambil dorar KOMPREHENSIF (SITE search) via proxy CF Worker → hukm + kategori
// (التصنيف الموضوعي → hadith_topic) + dorar hadithId (→ sharh/usul/similar kemudian).
// Pelihara kepelbagaian sanad. RESUMABLE (checkpoint kongsi dgn fetch-dorar-rulings).
//   node --env-file=.env.local scripts/fetch-dorar-full.mjs [--limit N] [--book ID] [--delay 1500] [--write]
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { normalizeArabic } from "./lib/arabic.mjs";
import { parseDorarSite } from "./lib/parse-dorar-site.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write");
const LIMIT = Number(arg("--limit", "0")) || 0;
const ONLY_BOOK = arg("--book", "");
const DELAY = Number(arg("--delay", "1500"));
const KEY = process.env.DORAR_KEY;
const BASE = process.env.DORAR_PROXY ?? "https://syaifulizhan.my/api/dorar";
if (!KEY) { console.error("DORAR_KEY hilang (.env.local)"); process.exit(1); }

const db = createClient({ url: "file:./data/corpus.db" });
const CK = "scripts/_dorar-full-checkpoint.json";
const ck = existsSync(CK) ? JSON.parse(readFileSync(CK, "utf8")) : { done: [] };
const doneSet = new Set(ck.done);

const MAJOR = [900003, 900007, 900001, 900009, 900008, 900005, 900006, 900002, 900004, 900010, 900011, 900012, 900013, 900014, 900015, 900016, 900017];
const bookName = new Map((await db.execute("SELECT id, title_ar FROM books")).rows.map((r) => [Number(r.id), String(r.title_ar ?? "")]));
const nb = (s) => normalizeArabic(s);

function matnQuery(matnAr) {
  let s = normalizeArabic(matnAr);
  const i = s.lastIndexOf("وسلم");
  if (i >= 0 && i < s.length - 12) s = s.slice(i + 4).trim();
  else { const w = s.split(" "); s = w.slice(Math.min(12, Math.max(0, w.length - 6))).join(" "); }
  return s.split(" ").filter(Boolean).slice(0, 9).join(" ");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchSite(query) {
  const path = encodeURIComponent(`/hadith/search?q=${query}&all`);
  const url = `${BASE}?key=${encodeURIComponent(KEY)}&skey=xxx&path=${path}`;
  for (let att = 0; att < 3; att++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (r.status === 200) return await r.text();
      if (r.status === 429 || r.status === 502) { await sleep(3000 * (att + 1)); continue; }
      return null;
    } catch { await sleep(2000 * (att + 1)); }
  }
  return null;
}

let where = ONLY_BOOK ? `h.book_id=${Number(ONLY_BOOK)}` : "1=1";
const rows = (await db.execute({ sql: `SELECT h.id, h.book_id, h.matn_ar FROM hadiths h WHERE ${where} ORDER BY h.book_id, h.id` }))
  .rows.map((r) => ({ id: Number(r.id), book: Number(r.book_id), matn: String(r.matn_ar) }));
rows.sort((a, b) => (MAJOR.indexOf(a.book) + 1 || 999) - (MAJOR.indexOf(b.book) + 1 || 999) || a.book - b.book || a.id - b.id);

let processed = 0, withPrimary = 0, savedR = 0, savedT = 0;
for (const h of rows) {
  if (doneSet.has(h.id)) continue;
  if (LIMIT && processed >= LIMIT) break;
  const q = matnQuery(h.matn);
  if (q.length < 8) { doneSet.add(h.id); continue; }
  const html = await fetchSite(q);
  processed++;
  if (!html) { console.log(`  #${h.id}: GAGAL`); await sleep(DELAY); continue; }
  const blocks = parseDorarSite(html);
  const ourNorm = nb(bookName.get(h.book) ?? "");
  const rulings = blocks.map((b, i) => ({ ...b, is_primary: b.source_book && nb(b.source_book) === ourNorm ? 1 : 0, ord: i + 1 }));
  const prim = rulings.filter((r) => r.is_primary);
  if (prim.length) withPrimary++;
  // kategori = dari blok primer (atau blok pertama) — klasifikasi hadis KITA
  const cats = [...new Set((prim[0] ?? blocks[0])?.categories ?? [])];
  if (processed <= 12 || processed % 50 === 0)
    console.log(`  #${h.id} ${bookName.get(h.book)}: ${rulings.length} hukm, primer ${prim.length}, kategori ${cats.length}`);
  if (WRITE) {
    for (const r of rulings)
      await db.execute({ sql: `INSERT OR IGNORE INTO hadith_ruling (hadith_id,rawi,muhaddith,source_book,ref,hukm,is_primary,ord,dorar_id,fetched_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        args: [h.id, r.rawi, r.muhaddith, r.source_book, r.ref, r.hukm, r.is_primary, r.ord, r.dorar_id, new Date().toISOString()] });
    for (const c of cats)
      await db.execute({ sql: "INSERT OR IGNORE INTO hadith_topic (hadith_id, topic_ar) VALUES (?,?)", args: [h.id, c] });
    savedR += rulings.length; savedT += cats.length;
  }
  doneSet.add(h.id);
  if (WRITE && processed % 25 === 0) { ck.done = [...doneSet]; writeFileSync(CK, JSON.stringify(ck)); }
  await sleep(DELAY);
}
if (WRITE) { ck.done = [...doneSet]; writeFileSync(CK, JSON.stringify(ck)); }
console.log(`\n${WRITE ? "✓" : "(DRY)"} diproses ${processed} · primer ${withPrimary} (${processed ? Math.round(withPrimary / processed * 100) : 0}%) · hukm ${savedR} · kategori ${savedT}`);
console.log(`checkpoint: ${doneSet.size} hadis`);
db.close();
