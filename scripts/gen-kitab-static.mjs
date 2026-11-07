#!/usr/bin/env node
// Penjana HTML statik halaman kitab — dijalankan SELEPAS `opennextjs-cloudflare build`.
//
//   .open-next/assets/kitab/<id>/index.html        halaman 1
//   .open-next/assets/kitab/<id>/<n>/index.html    halaman n (20 hadis, turutan seq)
//   .open-next/assets/kitab/<id>/toc.json          isi kandungan (dimuat bila dibuka)
//
// Tiada React/Next: baca korpus terus, pancar rentetan HTML (src/static/templates.mjs).
// Hanya kitab dalam belanjawan aset (scripts/lib/static-budget.mjs) dijana; selebihnya dihidang Worker dengan
// kod pemasangan yang sama (src/static/kitab-data.mjs). Sumber data: TURSO_DATABASE_URL (+TURSO_AUTH_TOKEN) bila ada, kalau tidak data/corpus.db
// (sama seperti src/lib/db.ts). STATIC_BOOK_LIMIT=N → N kitab terbesar sahaja (ujian).
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PER_PAGE } from "../src/static/templates.mjs";
import { kitabStmts, shapeRows, renderKitab, kitabNoOf, bookOf, tocJson } from "../src/static/kitab-data.mjs";
import { ASSETS, REMOTE, CONCURRENCY, rows, rowsSafe, cssHrefs, writeCssManifest, retryCount } from "./lib/static-common.mjs";
import { kitabBudget, planKitab } from "./lib/static-budget.mjs";

const OUT = join(ASSETS, "kitab");
const LIMIT = Number(process.env.STATIC_BOOK_LIMIT) || 0;

const sharahBookCache = new Map();
const sharahBook = async (ref) => {
  if (!sharahBookCache.has(ref)) sharahBookCache.set(ref, (await rowsSafe("SELECT id, name FROM turath_book WHERE book_ref=? LIMIT 1", [ref]))[0] ?? null);
  return sharahBookCache.get(ref);
};
const sharahCache = new Map();
async function sharahMeta(bookRef, kitabNo) {
  const key = `${bookRef}:${kitabNo}`;
  if (sharahCache.has(key)) return sharahCache.get(key);
  let meta = null;
  const bk = await sharahBook(bookRef);
  if (bk) {
    const nBab = Number((await rowsSafe("SELECT COUNT(DISTINCT bab_no) c FROM sharh_segment WHERE sharh_book_id=? AND kitab_no=? AND bab_no>0", [bk.id, kitabNo]))[0]?.c ?? 0);
    const any = nBab || Number((await rowsSafe("SELECT COUNT(*) c FROM sharh_segment WHERE sharh_book_id=? AND kitab_no=?", [bk.id, kitabNo]))[0]?.c ?? 0);
    if (any) meta = { book: bk, nBab };
  }
  sharahCache.set(key, meta);
  return meta;
}

// Satu "chunk" = CHUNK_PAGES halaman berturutan (500 hadis): enam query berjulat seq (kitabStmts, SQL yang sama
// dengan Worker) menggantikan ~7 query PER HALAMAN. Selepas itu halaman dipotong dalam memori.
const CHUNK_PAGES = 25;

async function buildChunk(book, total, totalPages, chunk, hasToc, emit) {
  const firstPage = chunk * CHUNK_PAGES + 1;
  const lastPage = Math.min(totalPages, firstPage + CHUNK_PAGES - 1);
  const lo = (firstPage - 1) * PER_PAGE;
  const hi = Math.min(total, lastPage * PER_PAGE);
  const [hadiths, isn, trs, ovr, bab, rul] = await Promise.all(
    kitabStmts(book.id, lo, hi).map((q, i) => (i === 0 ? rows : rowsSafe)(q.sql, q.args)));
  const expectedChunk = hi - lo;
  if (hadiths.length !== expectedChunk) throw new Error(`kitab ${book.id} chunk ${chunk}: ${hadiths.length} hadis, dijangka ${expectedChunk}`);
  const shaped = shapeRows({ isn, trs, ovr, bab, rul });

  for (let page = firstPage; page <= lastPage; page++) {
    const offset = (page - 1) * PER_PAGE;
    const pageHadiths = hadiths.slice(offset - lo, offset - lo + PER_PAGE);
    const expected = Math.min(PER_PAGE, total - offset);
    if (pageHadiths.length !== expected || pageHadiths.length === 0) {
      throw new Error(`kitab ${book.id} halaman ${page}: ${pageHadiths.length} hadis, dijangka ${expected}`);
    }
    const kitabNo = kitabNoOf(pageHadiths);
    const sharah = kitabNo ? await sharahMeta(book.id, kitabNo) : null;
    emit(page, renderKitab({ book, total, page, hadiths: pageHadiths, shaped, hasToc, sharah }, CSS));
  }
}

const write = (rel, content) => {
  const f = join(OUT, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, content);
  return Buffer.byteLength(content);
};

const CSS = cssHrefs();
writeCssManifest(CSS);
rmSync(OUT, { recursive: true, force: true });

const all = await rows("SELECT * FROM books ORDER BY id");
if (all.length < 900) throw new Error(`hanya ${all.length} kitab (dijangka >= 900) — korpus tidak lengkap?`);
const listed = all.map((b) => ({ ...bookOf(b), n: Number(b.total_hadith ?? 0) }));
// Belanjawan aset: satu tempat (scripts/lib/static-budget.mjs). STATIC_BOOK_LIMIT (ujian) = N kitab terbesar.
const budget = kitabBudget();
const plan = planKitab(listed, LIMIT ? Number.MAX_SAFE_INTEGER : budget);
let books = listed.filter((b) => plan.chosen.has(b.id));
if (LIMIT) books = books.sort((a, b) => b.n - a.n).slice(0, LIMIT);
console.log(JSON.stringify({
  budget: { assetBudget: budget, used: plan.used, staticBooks: books.length, leftOutBooks: plan.left.length, leftOutPages: plan.left.reduce((n, b) => n + b.cost, 0) },
  leftOut: plan.left.slice(0, 20).map((b) => `${b.id}:${b.n}`), // dihidang Worker (kitab-route.ts)
}));
let pages = 0, bytes = 0, tocFiles = 0, maxBytes = 0;
const t0 = Date.now();

for (const book of books) {
  const total = book.n;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const chapters = await rowsSafe("SELECT chapter_ref, chapter_ar, n, first_seq FROM book_chapter WHERE book_id=? ORDER BY first_seq", [book.id]);
  if (chapters.length) {
    bytes += write(`${book.id}/toc.json`, tocJson(chapters, total));
    tocFiles++;
  }
  const chunks = Array.from({ length: Math.ceil(totalPages / CHUNK_PAGES) }, (_, i) => i);
  const emit = (p, html) => {
    const n = write(p === 1 ? `${book.id}/index.html` : `${book.id}/${p}/index.html`, html);
    bytes += n; pages++; maxBytes = Math.max(maxBytes, n);
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let c; (c = chunks.shift()) !== undefined; ) await buildChunk(book, total, totalPages, c, chapters.length > 0, emit);
  }));
}

console.log(JSON.stringify({
  books: books.length, pages, tocFiles, totalKB: Math.round(bytes / 1024), avgPageKB: +(bytes / pages / 1024).toFixed(1),
  maxPageKB: +(maxBytes / 1024).toFixed(1), seconds: Math.round((Date.now() - t0) / 1000), retries: retryCount(), remote: REMOTE,
}));
