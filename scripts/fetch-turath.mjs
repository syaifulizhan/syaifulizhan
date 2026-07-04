// Pengambil turath.io (Maktabah Shamela) — TEKS PENUH + struktur كتاب→باب.
// AMANAH: turath = edisi akademik PROSA. Kita simpan (a) teks penuh (utk SYARAH,
// dipapar apa adanya) + (b) struktur heading كتاب/باب (title spans, BERSIH).
// Kita TIDAK ekstrak hadis individu dari prosa (berisiko silap — guna sumber bersegmen
// spt mhashim/islam-db utk hadis). Lokal sahaja; sync D1 berasingan (fikir saiz dulu).
//   node scripts/fetch-turath.mjs <turath_book_id> [--write]
import { createClient } from "@libsql/client";

const bookId = Number(process.argv[2]);
const WRITE = process.argv.includes("--write");
if (!bookId) { console.error("guna: node scripts/fetch-turath.mjs <turath_book_id> [--write]"); process.exit(1); }

const db = createClient({ url: "file:./data/corpus.db" });
await db.execute(`CREATE TABLE IF NOT EXISTS turath_book (id INTEGER PRIMARY KEY, name TEXT, author TEXT, info TEXT, npages INTEGER, fetched_at TEXT)`);
await db.execute(`CREATE TABLE IF NOT EXISTS turath_page (book_id INTEGER, idx INTEGER, vol TEXT, page INTEGER, text TEXT, PRIMARY KEY(book_id, idx))`);
await db.execute(`CREATE TABLE IF NOT EXISTS turath_heading (book_id INTEGER, idx INTEGER, level INTEGER, title TEXT, toc_id TEXT)`);
await db.execute(`CREATE INDEX IF NOT EXISTS idx_tpage_book ON turath_page(book_id)`);
await db.execute(`CREATE INDEX IF NOT EXISTS idx_theading_book ON turath_heading(book_id)`);

console.log(`→ Muat meta turath #${bookId}…`);
const meta = await (await fetch(`https://api.turath.io/book?id=${bookId}`)).json();
const m = meta?.meta ?? {};
console.log(`  ${m.name ?? "?"} — ${(m.info ?? "").slice(0, 60)}`);

console.log(`→ Muat teks penuh…`);
const data = await (await fetch(`https://files.turath.io/books-v3/${bookId}.json`)).json();
const pages = data?.pages ?? [];
console.log(`  ${pages.length} halaman`);

// ekstrak heading dari title spans (كتاب/باب) — level anggaran ikut awalan
const headings = [];
const titleRe = /<span[^>]*data-type="title"[^>]*id=(?:toc-)?([A-Za-z0-9-]+)[^>]*>([\s\S]*?)<\/span>/g;
pages.forEach((p, i) => {
  const t = p.text ?? "";
  let mm;
  while ((mm = titleRe.exec(t))) {
    const title = mm[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    // level: bermula "كتاب" = 1 (كتاب), ada nombor "N -" = 2 (باب), lain = 2
    const level = /^كتاب\s/.test(title) ? 1 : 2;
    headings.push({ idx: i, level, title, toc_id: mm[1] });
  }
});
const nKitab = headings.filter((h) => h.level === 1).length;
const nBab = headings.filter((h) => h.level === 2).length;
console.log(`  heading: ${headings.length} (كتاب ${nKitab} · باب/lain ${nBab})`);
console.log("  contoh كتاب:", headings.filter((h) => h.level === 1).slice(0, 5).map((h) => h.title));

if (!WRITE) { console.log("\n(DRY — --write utk simpan LOKAL)"); db.close(); process.exit(0); }

console.log("→ Simpan LOKAL…");
await db.execute({ sql: "INSERT OR REPLACE INTO turath_book (id,name,author,info,npages,fetched_at) VALUES (?,?,?,?,?,?)",
  args: [bookId, m.name ?? null, m.author_name ?? null, m.info ?? null, pages.length, new Date().toISOString()] });
await db.execute({ sql: "DELETE FROM turath_page WHERE book_id=?", args: [bookId] });
await db.execute({ sql: "DELETE FROM turath_heading WHERE book_id=?", args: [bookId] });
for (let i = 0; i < pages.length; i += 400) {
  await db.batch(pages.slice(i, i + 400).map((p, j) => ({
    sql: "INSERT OR REPLACE INTO turath_page (book_id,idx,vol,page,text) VALUES (?,?,?,?,?)",
    args: [bookId, i + j, p.vol ?? null, p.page ?? null, p.text ?? ""],
  })), "write");
}
for (let i = 0; i < headings.length; i += 400)
  await db.batch(headings.slice(i, i + 400).map((h) => ({
    sql: "INSERT INTO turath_heading (book_id,idx,level,title,toc_id) VALUES (?,?,?,?,?)",
    args: [bookId, h.idx, h.level, h.title, h.toc_id],
  })), "write");
console.log(`✓ Simpan: ${pages.length} halaman + ${headings.length} heading (LOKAL).`);
db.close();
