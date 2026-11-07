#!/usr/bin/env node
// Penjana HTML statik halaman kitab — dijalankan SELEPAS `opennextjs-cloudflare build`.
//
//   .open-next/assets/kitab/<id>/index.html        halaman 1
//   .open-next/assets/kitab/<id>/<n>/index.html    halaman n (20 hadis, turutan seq)
//   .open-next/assets/kitab/<id>/toc.json          isi kandungan (dimuat bila dibuka)
//
// Tiada React/Next: baca korpus terus, pancar rentetan HTML (src/static/templates.mjs).
// Sumber data: TURSO_DATABASE_URL (+TURSO_AUTH_TOKEN) bila ada, kalau tidak data/corpus.db
// (sama seperti src/lib/db.ts). STATIC_BOOK_LIMIT=N → N kitab terbesar sahaja (ujian).
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { normalizeArabic } from "../src/lib/arabic.ts";
import { kitabPage, splitRulings, PER_PAGE } from "../src/static/templates.mjs";

const ASSETS = ".open-next/assets";
const OUT = join(ASSETS, "kitab");
const LIMIT = Number(process.env.STATIC_BOOK_LIMIT) || 0;

/**
 * Sambungan DB. CI hanya ada TURSO_API_TOKEN (sama seperti kuota.yml/segar-seq.mjs):
 * token baca-sahaja 1 jam dijana di sini, jadi tiada rahsia DB tambahan di GitHub.
 * Di CI (env CI=true) tanpa sebarang kelayakan → gagal, jangan deploy laman kosong.
 */
async function connect() {
  const env = process.env;
  if (env.TURSO_DATABASE_URL) return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  if (env.TURSO_API_TOKEN) {
    const org = env.TURSO_ORG || "syaifulizhan-thgzut";
    const name = env.TURSO_DB || "dewan-izhan-v3";
    const api = async (path, init = {}) => {
      const r = await fetch(`https://api.turso.tech/v1/organizations/${org}/databases/${name}${path}`, {
        ...init, headers: { Authorization: `Bearer ${env.TURSO_API_TOKEN}` },
      });
      if (!r.ok) throw new Error(`Turso API ${path}: HTTP ${r.status}`);
      return r.json();
    };
    const { database } = await api("");
    const { jwt } = await api("/auth/tokens?expiration=1h&authorization=read-only", { method: "POST" });
    return createClient({ url: `libsql://${database.Hostname}`, authToken: jwt });
  }
  if (env.CI) throw new Error("gen-kitab-static: no Turso credentials in CI (set TURSO_API_TOKEN)");
  return createClient({ url: "file:./data/corpus.db" });
}
const db = await connect();
const REMOTE = !String(db.protocol ?? "").startsWith("file");
const CONCURRENCY = REMOTE ? 4 : 8;

/** Ralat sementara (aliran HTTP Turso/rangkaian) yang berbaloi dicuba semula. */
const TRANSIENT = /SERVER_ERROR|HTTP status [45]\d\d|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|network|stream|timed? ?out/i;
const BACKOFF_MS = [1000, 3000, 9000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let retries = 0;
/** Satu execute dengan 3 cubaan semula (1s/3s/9s); selepas itu gagal keras. "no such table" tidak dicuba semula. */
const rows = async (sql, args = []) => {
  for (let attempt = 0; ; attempt++) {
    try { return (await db.execute({ sql, args })).rows; }
    catch (e) {
      const msg = String(e?.message ?? e);
      if (attempt >= BACKOFF_MS.length || /no such table/i.test(msg) || !TRANSIENT.test(msg)) throw e;
      retries++;
      console.warn(`cuba semula ${attempt + 1}/${BACKOFF_MS.length} (${msg.slice(0, 80)})`);
      await sleep(BACKOFF_MS[attempt]);
    }
  }
};
/** Jadual pilihan (cth override sanad) mungkin tiada: HANYA "no such table" dikosongkan; ralat lain dilempar. */
const rowsSafe = async (sql, args = []) => {
  try { return await rows(sql, args); }
  catch (e) { if (/no such table/i.test(String(e?.message ?? e))) return []; throw e; }
};
const group = (list, key) => {
  const m = new Map();
  for (const r of list) { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
};

function cssHrefs() {
  const root = join(ASSETS, "_next/static");
  if (!existsSync(root)) throw new Error(`${root} tiada — jalankan opennextjs-cloudflare build dahulu`);
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css") && /\.hcard|\.pwrap/.test(readFileSync(p, "utf8"))) found.push("/" + relative(ASSETS, p));
    }
  };
  walk(root);
  if (!found.length) throw new Error("CSS Next (.hcard/.pwrap) tidak ditemui");
  return found;
}

// Sahihayn sahaja boleh dipaut (lihat DORAR_LINKABLE dalam src/lib/hadis.ts).
const LINKABLE = { "صحيح البخاري": 900003, "صحيح مسلم": 900007 };
let linkTargets = null; // "book:number" → id hadis, dimuat sekali (~14k baris) bukan per halaman
const loadLinkTargets = async () => {
  if (!linkTargets) {
    const hr = await rows(`SELECT id, book_id, number FROM hadiths WHERE book_id IN (${Object.values(LINKABLE).join(",")})`);
    linkTargets = new Map(hr.map((x) => [`${x.book_id}:${x.number}`, x.id]));
  }
  return linkTargets;
};

async function shapeRulings(list) {
  const out = new Map();
  const tgt = await loadLinkTargets();
  for (const [id, arr] of group(list, "hadith_id")) {
    const { shown, hidden } = splitRulings(arr.map((r) => ({ ...r })));
    out.set(id, { shown, hiddenCount: hidden.length });
    for (const r of shown) {
      const bid = LINKABLE[normalizeArabic(r.source_book)];
      const num = r.ref && /^\d+$/.test(String(r.ref).trim()) ? Number(String(r.ref).trim()) : null;
      const target = bid && num ? tgt.get(`${bid}:${num}`) : null;
      if (target) r.href = `/x/h/${target}/`;
    }
  }
  return out;
}

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

// Satu "chunk" = CHUNK_PAGES halaman berturutan (500 hadis): enam query berjulat seq (JOIN pada hadiths,
// tiada senarai IN panjang) menggantikan ~7 query PER HALAMAN. Selepas itu halaman dipotong dalam memori.
const CHUNK_PAGES = 25;
const seqJoin = "FROM hadiths h JOIN";
const seqWhere = "WHERE h.book_id=? AND h.seq>? AND h.seq<=?";

async function buildChunk(book, total, totalPages, chunk, chapterCount, emit) {
  const firstPage = chunk * CHUNK_PAGES + 1;
  const lastPage = Math.min(totalPages, firstPage + CHUNK_PAGES - 1);
  const lo = (firstPage - 1) * PER_PAGE;
  const hi = Math.min(total, lastPage * PER_PAGE);
  const a = [book.id, lo, hi];
  const [hadiths, isn, trs, ovr, bab, rul] = await Promise.all([
    rows("SELECT id, book_id, chapter_ar, chapter_ref, number, matn_ar, grade FROM hadiths WHERE book_id=? AND seq>? AND seq<=? ORDER BY seq", a),
    rowsSafe(`SELECT hn.hadith_id, hn.narrator_id, COALESCE(hn.chain_no,0) chain_no, hn.position, hn.raw_name, n.name_ar resolved
                ${seqJoin} hadith_narrators hn ON hn.hadith_id = h.id LEFT JOIN narrators n ON n.id = hn.narrator_id
               ${seqWhere} ORDER BY hn.hadith_id, chain_no, hn.position`, a),
    rowsSafe(`SELECT t.entity_id, t.lang, t.text, t.is_verified ${seqJoin} translations t ON t.entity_id = h.id
               ${seqWhere} AND t.entity_type='hadith' AND t.lang IN ('ms','en')`, a),
    rowsSafe(`SELECT o.hadith_id, o.nodes_json ${seqJoin} hadith_sanad_override o ON o.hadith_id = h.id ${seqWhere}`, a),
    rowsSafe(`SELECT b.hadith_id, b.kitab_title, b.bab_no, b.bab_title ${seqJoin} hadith_bab b ON b.hadith_id = h.id ${seqWhere}`, a),
    rowsSafe(`SELECT r.hadith_id, r.rawi, r.muhaddith, r.source_book, r.ref, r.hukm, r.is_primary
                ${seqJoin} hadith_ruling r ON r.hadith_id = h.id ${seqWhere} ORDER BY r.hadith_id, r.is_primary DESC, r.ord`, a),
  ]);
  const expectedChunk = hi - lo;
  if (hadiths.length !== expectedChunk) throw new Error(`kitab ${book.id} chunk ${chunk}: ${hadiths.length} hadis, dijangka ${expectedChunk}`);

  const trMap = new Map();
  for (const r of trs) {
    const t = trMap.get(r.entity_id) ?? { ms: null, en: null, ms_verified: false, en_verified: false };
    t[r.lang] = r.text; t[`${r.lang}_verified`] = !!r.is_verified;
    trMap.set(r.entity_id, t);
  }
  const overrides = new Map();
  for (const r of ovr) {
    try { overrides.set(r.hadith_id, JSON.parse(r.nodes_json)); }
    catch (e) { throw new Error(`override sanad rosak untuk hadis ${r.hadith_id}: ${e.message}`); }
  }
  const isnads = group(isn, "hadith_id");
  const rulings = await shapeRulings(rul);
  const babs = new Map(bab.map((b) => [b.hadith_id, b]));

  for (let page = firstPage; page <= lastPage; page++) {
    const offset = (page - 1) * PER_PAGE;
    const pageHadiths = hadiths.slice(offset - lo, offset - lo + PER_PAGE);
    const expected = Math.min(PER_PAGE, total - offset);
    if (pageHadiths.length !== expected || pageHadiths.length === 0) {
      throw new Error(`kitab ${book.id} halaman ${page}: ${pageHadiths.length} hadis, dijangka ${expected}`);
    }
    const kitabNo = pageHadiths.find((h) => h.chapter_ref != null)?.chapter_ref ?? 0;
    const sharah = kitabNo ? await sharahMeta(book.id, kitabNo) : null;
    emit(page, kitabPage({
      book, total, page, totalPages, hadiths: pageHadiths, chapterCount, sharah, kitabNo,
      isnads, overrides, trs: trMap, rulings, babs,
    }, CSS, { legacyScript: page === 1 }));
  }
}

const write = (rel, content) => {
  const f = join(OUT, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, content);
  return Buffer.byteLength(content);
};

const CSS = cssHrefs();
rmSync(OUT, { recursive: true, force: true });

const books = await rows(
  `SELECT id, title_ar, COALESCE(total_hadith,0) n FROM books ${LIMIT ? "ORDER BY n DESC" : "ORDER BY id"} ${LIMIT ? `LIMIT ${LIMIT}` : ""}`);
if (!LIMIT && books.length < 900) throw new Error(`hanya ${books.length} kitab (dijangka >= 900) — korpus tidak lengkap?`);
let pages = 0, bytes = 0, tocFiles = 0, maxBytes = 0;
const t0 = Date.now();

for (const b of books) {
  const book = { id: Number(b.id), title_ar: b.title_ar };
  const total = Number(b.n);
  if (total <= 0) { console.warn(`langkau kitab ${book.id}: tiada hadis (sandaran SSR)`); continue; }
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const chapters = await rowsSafe("SELECT chapter_ref, chapter_ar, n, first_seq FROM book_chapter WHERE book_id=? ORDER BY first_seq", [book.id]);
  if (chapters.length) {
    bytes += write(`${book.id}/toc.json`, JSON.stringify(chapters.map((c) => [c.chapter_ref, c.chapter_ar, Number(c.n), Math.min(totalPages, Math.floor((Math.max(Number(c.first_seq), 1) - 1) / PER_PAGE) + 1)])));
    tocFiles++;
  }
  const chunks = Array.from({ length: Math.ceil(totalPages / CHUNK_PAGES) }, (_, i) => i);
  const emit = (p, html) => {
    const n = write(p === 1 ? `${book.id}/index.html` : `${book.id}/${p}/index.html`, html);
    bytes += n; pages++; maxBytes = Math.max(maxBytes, n);
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let c; (c = chunks.shift()) !== undefined; ) await buildChunk(book, total, totalPages, c, chapters.length, emit);
  }));
}

console.log(JSON.stringify({
  books: books.length, pages, tocFiles, totalKB: Math.round(bytes / 1024), avgPageKB: +(bytes / pages / 1024).toFixed(1),
  maxPageKB: +(maxBytes / 1024).toFixed(1), seconds: Math.round((Date.now() - t0) / 1000), retries, remote: REMOTE,
}));
