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
const CONCURRENCY = 8;

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
const rows = async (sql, args = []) => (await db.execute({ sql, args })).rows;
/** Jadual pilihan (cth override sanad) mungkin tiada: HANYA "no such table" dikosongkan; ralat lain dilempar. */
const rowsSafe = async (sql, args = []) => {
  try { return await rows(sql, args); }
  catch (e) { if (/no such table/i.test(String(e?.message ?? e))) return []; throw e; }
};
const ph = (n) => Array(n).fill("?").join(",");
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

async function loadRulings(ids) {
  const out = new Map();
  const list = await rowsSafe(
    `SELECT hadith_id, rawi, muhaddith, source_book, ref, hukm, is_primary FROM hadith_ruling WHERE hadith_id IN (${ph(ids.length)}) ORDER BY is_primary DESC, ord`, ids);
  const byH = group(list, "hadith_id");
  const wanted = [];
  for (const [id, arr] of byH) {
    const { shown, hidden } = splitRulings(arr.map((r) => ({ ...r })));
    out.set(id, { shown, hiddenCount: hidden.length });
    for (const r of shown) {
      const bid = LINKABLE[normalizeArabic(r.source_book)];
      const num = r.ref && /^\d+$/.test(String(r.ref).trim()) ? Number(String(r.ref).trim()) : null;
      if (bid && num) wanted.push({ bid, num, r });
    }
  }
  if (wanted.length) {
    const keys = [...new Set(wanted.map((w) => `${w.bid}:${w.num}`))];
    const hr = await rowsSafe(`SELECT id, book_id, number FROM hadiths WHERE (book_id, number) IN (VALUES ${keys.map(() => "(?,?)").join(",")})`, keys.flatMap((k) => k.split(":").map(Number)));
    const tgt = new Map(hr.map((x) => [`${x.book_id}:${x.number}`, x.id]));
    for (const w of wanted) { const id = tgt.get(`${w.bid}:${w.num}`); if (id) w.r.href = `/x/h/${id}/`; }
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

async function buildPage(book, total, totalPages, page, chapterCount) {
  const offset = (page - 1) * PER_PAGE;
  const hadiths = await rows(
    "SELECT id, book_id, chapter_ar, chapter_ref, number, matn_ar, grade FROM hadiths WHERE book_id=? AND seq>? AND seq<=? ORDER BY seq",
    [book.id, offset, offset + PER_PAGE]);
  const expected = Math.min(PER_PAGE, total - offset);
  if (hadiths.length !== expected || hadiths.length === 0) {
    throw new Error(`kitab ${book.id} halaman ${page}: ${hadiths.length} hadis, dijangka ${expected}`);
  }
  const ids = hadiths.map((h) => h.id);
  const kitabNo = hadiths.find((h) => h.chapter_ref != null)?.chapter_ref ?? 0;
  const inIds = ph(ids.length);
  const [isn, trs, ovr, bab, rul, sharah] = ids.length
    ? await Promise.all([
        rowsSafe(`SELECT hn.hadith_id, hn.narrator_id, COALESCE(hn.chain_no,0) chain_no, hn.position, hn.raw_name, n.name_ar resolved
                    FROM hadith_narrators hn LEFT JOIN narrators n ON n.id = hn.narrator_id
                   WHERE hn.hadith_id IN (${inIds}) ORDER BY hn.hadith_id, chain_no, hn.position`, ids),
        rowsSafe(`SELECT entity_id, lang, text, is_verified FROM translations WHERE entity_type='hadith' AND entity_id IN (${inIds}) AND lang IN ('ms','en')`, ids),
        rowsSafe(`SELECT hadith_id, nodes_json FROM hadith_sanad_override WHERE hadith_id IN (${inIds})`, ids),
        rowsSafe(`SELECT hadith_id, kitab_title, bab_no, bab_title FROM hadith_bab WHERE hadith_id IN (${inIds})`, ids),
        loadRulings(ids),
        kitabNo ? sharahMeta(book.id, kitabNo) : null,
      ])
    : [[], [], [], [], new Map(), null];

  const trMap = new Map();
  for (const r of trs) {
    const t = trMap.get(r.entity_id) ?? { ms: null, en: null, ms_verified: false, en_verified: false };
    t[r.lang] = r.text; t[`${r.lang}_verified`] = !!r.is_verified;
    trMap.set(r.entity_id, t);
  }
  const overrides = new Map();
  for (const r of ovr) { { try { overrides.set(r.hadith_id, JSON.parse(r.nodes_json)); } catch (e) { throw new Error(`override sanad rosak untuk hadis ${r.hadith_id}: ${e.message}`); } } }

  return kitabPage({
    book, total, page, totalPages, hadiths, chapterCount, sharah, kitabNo,
    isnads: group(isn, "hadith_id"), overrides, trs: trMap, rulings: rul,
    babs: new Map(bab.map((b) => [b.hadith_id, b])),
  }, CSS, { legacyScript: page === 1 });
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
  const todo = Array.from({ length: totalPages }, (_, i) => i + 1);
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let p; (p = todo.shift()); ) {
      const html = await buildPage(book, total, totalPages, p, chapters.length);
      const n = write(p === 1 ? `${book.id}/index.html` : `${book.id}/${p}/index.html`, html);
      bytes += n; pages++; maxBytes = Math.max(maxBytes, n);
    }
  }));
}

console.log(JSON.stringify({
  books: books.length, pages, tocFiles, totalKB: Math.round(bytes / 1024), avgPageKB: +(bytes / pages / 1024).toFixed(1),
  maxPageKB: +(maxBytes / 1024).toFixed(1), seconds: Math.round((Date.now() - t0) / 1000),
}));
