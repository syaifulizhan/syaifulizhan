#!/usr/bin/env node
// H1 pilot importer: ONE local Maktabah Shamela hadith book -> corpus rows (hadiths + chapters), LOCAL ONLY.
//
//   node scripts/shamela/import-book.mjs <corpusBookId> <shamelaBookId> --out <corpus copy .db>
//        [--src data/corpus.db] [--label "<edition label>"] [--merged-stub <stub src_ref>=<first narrator position to drop>] [--dry]
//
// Never touches --src (opened read-only) and refuses to write to data/corpus.db. Writes:
//   <out>.delta/hadiths.jsonl   one row per hadith  (raqm = printed number of the chosen edition)
//   <out>.delta/headings.jsonl  kitab/bab tree with first raqm + hadith count
//   <out>.delta/notes.jsonl     muhaqqiq comments, kept SEPARATE (not imported: Turso write/storage cost)
//   <out>.delta/delta.sql       self-contained, idempotent (BEGIN..COMMIT, FTS inserts included); apply with apply-delta.mjs
//   <out>.delta/rollback.sql    restores the pre-import rows; <out>.delta/rollback-backup.json = the old stub rows (src_ref, number, matn) + removed narrator links
//   <out>.delta/stats.json      counts, gaps, duplicates, stub matching, cost estimate
// Decision E1 (8 Nov 2026): per-source numbering + honest edition label -> books.numbering_edition (E2 migration).
import { copyFileSync, existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { normalizeArabic } from "../lib/arabic.mjs";
import { applySqlFile } from "./apply-delta.mjs";
import { SHAMELA_ROOT, startHelper } from "./helper-client.mjs";
import { parseBook } from "./parse-book.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const dry = args.includes("--dry");
const outPath = flag("--out");
const srcPath = resolve(flag("--src") || "data/corpus.db");
const labelArg = flag("--label");
const [cid, sid] = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!cid || !sid || !outPath) { console.error("usage: import-book.mjs <corpusBookId> <shamelaBookId> --out <copy.db> [--src] [--label] [--dry]"); process.exit(1); }
const out = resolve(outPath);
if (realpathSync(srcPath) === (existsSync(out) ? realpathSync(out) : out)) { console.error("refusing: --out is the source corpus"); process.exit(1); }
if (/data\/corpus\.db$/.test(out)) { console.error("refusing: --out must be a scratch copy"); process.exit(1); }

const sqlStr = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

// ── 1. Shamela side (read-only) ──
const master = new DatabaseSync(`${SHAMELA_ROOT}/database/master.db`, { readOnly: true });
const meta = master.prepare("select b.book_name, a.author_name from book b left join author a on a.author_id=b.main_author where b.book_id=?").get(sid);
if (!meta) { console.error(`Shamela book ${sid} not found`); process.exit(1); }
const bdb = new DatabaseSync(`${SHAMELA_ROOT}/database/book/${String(sid % 1000).padStart(3, "0")}/${sid}.db`, { readOnly: true });
const pageRows = bdb.prepare("select id from page order by id").all();
const titleRows = bdb.prepare("select id, page, parent from title order by id").all();
const titleParent = new Map(titleRows.map((r) => [r.id, r.parent]));
const titleByPage = new Map();
for (const r of titleRows) if (!titleByPage.has(r.page)) titleByPage.set(r.page, r.id);
const helper = startHelper();
const pages = [];
for (let i = 0; i < pageRows.length; i += 200) {
  const r = await helper.request("get_pages_batch", { book_id: sid, page_ids: pageRows.slice(i, i + 200).map((p) => p.id) });
  pages.push(...r.results);
}
helper.close();
const parsed = parseBook(pages, titleParent, titleByPage);

// ── 2. quality: empty hadiths are quarantined (reported, not imported); duplicate raqm get a suffix ──
const quarantined = parsed.hadiths.filter((h) => h.matn.length < 15);
const good = parsed.hadiths.filter((h) => h.matn.length >= 15);
const seen = new Map();
const edition = labelArg || `ترقيم الشاملة: ${meta.book_name} (#${sid})`;
const headingByOrd = new Map(parsed.headings.map((h) => [h.ord, h]));
const rows = good.map((h) => {
  const k = (seen.get(h.raqm) || 0) + 1;
  seen.set(h.raqm, k);
  const ch = h.chapterOrd ? headingByOrd.get(h.chapterOrd) : null;
  return {
    src_ref: `shamela:${sid}:${h.raqm}${k > 1 ? `:${k}` : ""}`,
    raqm: h.raqm, dup_index: k, page_id: h.page_id,
    chapter_ref: h.chapterOrd, chapter_ar: ch ? ch.text : null,
    matn_ar: h.matn, matn_search: normalizeArabic(h.matn),
  };
});
const raqms = new Set(rows.map((r) => r.raqm));
const last = Math.max(...raqms);
const gaps = []; for (let i = 1; i <= last; i++) if (!raqms.has(i)) gaps.push(i);
const dups = rows.filter((r) => r.dup_index > 1).map((r) => r.raqm);

// ── 3. corpus side: stubs, max id (read-only on src) ──
const src = new DatabaseSync(srcPath, { readOnly: true });
const book = src.prepare("select * from books where id=?").get(cid);
if (!book) { console.error(`corpus book ${cid} not found`); process.exit(1); }
const stubs = src.prepare("select id, src_ref, matn_ar from hadiths where book_id=?").all(cid);
const GENERIC = new Set(["حدثنا", "ثنا", "نا", "اخبرنا", "انا", "حدثني", "اخبرني", "ناه", "ثني", "ان"]);
const key = (t) => normalizeArabic(t).split(" ").filter((w) => !GENERIC.has(w)).slice(0, 8).join(" ");
const byKey = new Map();
for (const r of rows) { const k = key(r.matn_ar); (byKey.get(k) || byKey.set(k, []).get(k)).push(r); }
const words = (t) => new Set(normalizeArabic(t).split(" ").filter((w) => !GENERIC.has(w)).slice(0, 60));
const jaccard = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.size + b.size - i || 1); };
const stubMatch = stubs.map((s) => {
  let m = byKey.get(key(s.matn_ar)) || [];
  let note = "prefix";
  if (m.length > 1) { // ambiguous isnad prefix: rank by word overlap, accept only a clear winner
    const sw = words(s.matn_ar);
    const sc = m.map((x) => [x, jaccard(sw, words(x.matn_ar))]).sort((a, b) => b[1] - a[1]);
    if (sc[0][1] >= 0.5 && sc[0][1] - sc[1][1] >= 0.15) { m = [sc[0][0]]; note = `overlap ${sc[0][1].toFixed(2)}`; }
    else note = `ambiguous (best ${sc[0][1].toFixed(2)} vs ${sc[1][1].toFixed(2)})`;
  }
  return { stub_id: s.id, stub_src_ref: s.src_ref, matched: m.length === 1, how: note, candidates: m.map((x) => x.raqm), raqm: m.length === 1 ? m[0].raqm : null };
});
const matchedRef = new Map(stubMatch.filter((s) => s.matched).map((s) => [s.raqm, s]));
const stubById = new Map(stubs.map((s) => [s.id, s]));

// A stub that islam-db merged from two printed hadiths (e.g. 301+302): keep its row for the FIRST raqm (ids/links stay stable),
// insert the second fresh, and drop the narrator links from <position> onward (they belong to the second hadith's isnad).
const mergedStubs = [];
for (let i; (i = args.indexOf("--merged-stub")) >= 0; ) {
  const [ref, pos] = args.splice(i, 2)[1].split("=");
  mergedStubs.push({ src_ref: ref, from_position: Number(pos) });
}

// ── 4. old state (rollback source) ──
const stubIds = stubs.map((s) => s.id);
const inList = (a) => (a.length ? a.map(sqlStr).join(",") : "NULL");
const oldHadiths = src.prepare(`select * from hadiths where book_id=? order by id`).all(cid);
const oldLinks = stubIds.length ? src.prepare(`select * from hadith_narrators where hadith_id in (${inList(stubIds)})`).all() : [];
const oldBook = src.prepare("select * from books where id=?").get(cid);
const oldChapters = src.prepare("select * from book_chapter where book_id=?").all(cid);
const cols = (row) => Object.keys(row);
const insertSql = (table, row, verb = "INSERT") => `${verb} INTO ${table} (${cols(row).join(", ")}) VALUES (${cols(row).map((c) => sqlStr(row[c])).join(", ")});`;

// ── 5. delta.sql (self-contained, idempotent) ──
const now = new Date().toISOString();
const shamelaLike = `src_ref LIKE 'shamela:${sid}:%'`;
const newRow = (r) => `INSERT OR IGNORE INTO hadiths (src_ref, book_id, chapter_ref, chapter_ar, number, matn_ar, matn_search, scraped_at) VALUES (${sqlStr(r.src_ref)}, ${cid}, ${r.chapter_ref ?? "NULL"}, ${sqlStr(r.chapter_ar)}, ${r.raqm}, ${sqlStr(r.matn_ar)}, ${sqlStr(r.matn_search)}, ${sqlStr(now)});`;
const stubUpdate = (s, r) => `UPDATE hadiths SET src_ref=${sqlStr(r.src_ref)}, chapter_ref=${r.chapter_ref ?? "NULL"}, chapter_ar=${sqlStr(r.chapter_ar)}, number=${r.raqm}, matn_ar=${sqlStr(r.matn_ar)}, matn_search=${sqlStr(r.matn_search)}, scraped_at=${sqlStr(now)} WHERE book_id=${cid} AND src_ref=${sqlStr(s.stub_src_ref)};`;
const ftsDelete = (where) => `INSERT INTO hadiths_fts(hadiths_fts, rowid, matn_search) SELECT 'delete', id, matn_search FROM hadiths WHERE ${where} AND id IN (SELECT id FROM hadiths_fts_docsize);`;
const ftsAdd = (where) => `INSERT INTO hadiths_fts(rowid, matn_search) SELECT id, matn_search FROM hadiths WHERE ${where} AND id NOT IN (SELECT id FROM hadiths_fts_docsize);`;
const seqRefresh = [
  // two steps: the UNIQUE(book_id, seq) index must never see two equal values mid-statement
  `WITH r AS (SELECT id, seq, row_number() OVER (ORDER BY chapter_ref, number, id) rn FROM hadiths WHERE book_id=${cid}) UPDATE hadiths SET seq = NULL WHERE id IN (SELECT id FROM r WHERE seq IS NOT rn);`,
  `UPDATE hadiths SET seq = t.rn FROM (SELECT id, row_number() OVER (ORDER BY chapter_ref, number, id) rn FROM hadiths WHERE book_id=${cid}) t WHERE t.id = hadiths.id AND hadiths.seq IS NOT t.rn;`,
];
const bookRefresh = (extra = "") => [
  `DELETE FROM book_chapter WHERE book_id=${cid};`,
  `INSERT INTO book_chapter (book_id, first_seq, chapter_ref, chapter_ar, n) SELECT book_id, min(seq), chapter_ref, chapter_ar, count(*) FROM hadiths WHERE book_id=${cid} AND chapter_ar IS NOT NULL AND length(chapter_ar)>0 GROUP BY book_id, chapter_ref, chapter_ar;`,
  `UPDATE books SET total_hadith = (SELECT count(*) FROM hadiths WHERE book_id=${cid}), chapter_count = (SELECT count(*) FROM book_chapter WHERE book_id=${cid})${extra} WHERE id=${cid};`,
];

const stubRefs = stubs.map((s) => s.src_ref);
const delta = [
  `-- delta: corpus book ${cid} <- Shamela #${sid} (${meta.book_name}). Idempotent; needs books.numbering_edition (db/migrations/2026-11-08-numbering-edition.sql, added by the runner if missing).`,
  "BEGIN;",
  // FTS (external content) must forget the stubs' OLD text before it changes
  ftsDelete(`book_id=${cid} AND src_ref IN (${inList(stubRefs)})`),
];
for (const [, s] of matchedRef) delta.push(stubUpdate(s, rows.find((x) => x.raqm === s.raqm && x.dup_index === 1)));
for (const m of mergedStubs) {
  delta.push(`DELETE FROM hadith_narrators WHERE position >= ${m.from_position} AND hadith_id IN (SELECT id FROM hadiths WHERE book_id=${cid} AND src_ref IN (${inList([m.src_ref, `shamela:${sid}:${stubMatch.find((s) => s.stub_src_ref === m.src_ref).raqm}`])}));`);
}
const replaced = new Set([...matchedRef.keys()]);
const toInsert = rows.filter((r) => !(r.dup_index === 1 && replaced.has(r.raqm)));
for (const r of toInsert) delta.push(newRow(r));
delta.push(ftsAdd(`book_id=${cid} AND ${shamelaLike}`));
delta.push(...seqRefresh, ...bookRefresh());
delta.push(`UPDATE books SET numbering_edition = ${sqlStr(edition)} WHERE id = ${cid};`, "COMMIT;");

// ── 6. rollback.sql (restores the exact old rows from this file; ids are those of the database it was generated from) ──
const rollback = [
  `-- rollback of delta.sql for book ${cid}. Generated from the pre-import state. Idempotent.`,
  "BEGIN;",
  ftsDelete(`book_id=${cid} AND (${shamelaLike} OR id IN (${inList(stubIds)}))`),
  `DELETE FROM hadiths WHERE book_id=${cid} AND ${shamelaLike} AND id NOT IN (${inList(stubIds)});`,
  `UPDATE hadiths SET seq = NULL WHERE book_id=${cid};`,
];
for (const h of oldHadiths) rollback.push(`UPDATE hadiths SET ${cols(h).filter((c) => c !== "id").map((c) => `${c}=${sqlStr(h[c])}`).join(", ")} WHERE id=${h.id};`);
for (const l of oldLinks) {
  rollback.push(`INSERT INTO hadith_narrators (${cols(l).join(", ")}) SELECT ${cols(l).map((c) => sqlStr(l[c])).join(", ")} WHERE NOT EXISTS (SELECT 1 FROM hadith_narrators WHERE hadith_id=${l.hadith_id} AND position=${l.position});`);
}
rollback.push(ftsAdd(`book_id=${cid}`));
rollback.push(`DELETE FROM book_chapter WHERE book_id=${cid};`);
for (const c of oldChapters) rollback.push(insertSql("book_chapter", c));
const oldCols = ["total_hadith", "chapter_count", "source", "title_en", "author_ar"].filter((c) => c in oldBook);
rollback.push(`UPDATE books SET numbering_edition = NULL, ${oldCols.filter((c) => ["total_hadith", "chapter_count"].includes(c)).map((c) => `${c}=${sqlStr(oldBook[c])}`).join(", ")} WHERE id=${cid};`, "COMMIT;");

const dir = `${out}.delta`;
mkdirSync(dir, { recursive: true });
const jl = (a) => a.map((x) => JSON.stringify(x)).join("\n") + "\n";
const headingsOut = parsed.headings.map((h) => {
  const hs = parsed.hadiths.filter((x) => x.chapterOrd === h.ord);
  return { ord: h.ord, level: h.level, text: h.text, first_raqm: hs[0]?.raqm ?? null, n_hadith: hs.length };
});
writeFileSync(`${dir}/hadiths.jsonl`, jl(rows));
writeFileSync(`${dir}/headings.jsonl`, jl(headingsOut));
writeFileSync(`${dir}/notes.jsonl`, jl(parsed.notes));
writeFileSync(`${dir}/delta.sql`, delta.join("\n") + "\n");
writeFileSync(`${dir}/rollback.sql`, rollback.join("\n") + "\n");
writeFileSync(`${dir}/rollback-backup.json`, JSON.stringify({ hadiths: oldHadiths.map((h) => ({ src_ref: h.src_ref, number: h.number, matn_ar: h.matn_ar, id: h.id })), narrator_links: oldLinks, book: oldBook }, null, 1));

const empty = quarantined.map((h) => h.raqm);
const stats = {
  corpus_book: cid, shamela_book: sid, shamela_title: meta.book_name, edition_label: edition,
  pages: pages.length, hadiths_parsed: parsed.hadiths.length, hadiths_importable: rows.length,
  last_raqm: last, gaps_count: gaps.length, gaps, duplicate_raqm: dups,
  quarantined_empty: empty,
  source_anomalies: empty.map((r) => ({
    raqm: r, note: `Shamela prints "${r} -" with an EMPTY text; its muhaqqiq note ("${r} - قال الأعظمي…") sits AFTER hadith ${r + 1}, not after ${r}. Quarantined, not imported, counted as a gap.`,
    note_in_notes_jsonl: parsed.notes.filter((n) => n.raqm === r).length,
  })),
  headings: { kitab: parsed.headings.filter((h) => h.level === 1).length, bab: parsed.headings.filter((h) => h.level > 1).length },
  muhaqqiq_notes: parsed.notes.length, page_footnotes: parsed.footnotes.length,
  parser_anomalies: parsed.anomalies.length,
  stubs: {
    total: stubs.length, matched_unique: stubMatch.filter((s) => s.matched).length, detail: stubMatch,
    policy: "UPDATE in place keyed by old src_ref (ids + narrator links stay stable; links need re-linking since matn text changed). Merged islam-db stub(s): " +
      (mergedStubs.map((m) => `${m.src_ref} -> keeps first raqm, narrator links with position >= ${m.from_position} dropped (they belong to the second hadith), second raqm inserted fresh`).join("; ") || "none") +
      ". Old rows + removed links are in rollback.sql / rollback-backup.json.",
  },
  inserts: toInsert.length, stub_updates_in_place: matchedRef.size,
  payload_bytes: { matn_ar: rows.reduce((a, r) => a + Buffer.byteLength(r.matn_ar), 0), matn_search: rows.reduce((a, r) => a + Buffer.byteLength(r.matn_search), 0) },
};

// ── 7. apply to the COPY (same runner a human would use) ──
if (!dry) {
  if (!existsSync(out)) copyFileSync(srcPath, out);
  const db = new DatabaseSync(out);
  const sz = () => { const g = (p) => db.prepare(`PRAGMA ${p}`).get(); return (g("page_count").page_count - g("freelist_count").freelist_count) * g("page_size").page_size; };
  const fts = () => ["hadiths_fts_data", "hadiths_fts_idx", "hadiths_fts_docsize"].map((t) => db.prepare(`select count(*) c from ${t}`).get().c);
  const before = { bytes: sz(), fts: fts(), hadiths: db.prepare("select count(*) c from hadiths").get().c };
  db.close();
  applySqlFile(out, `${dir}/delta.sql`);
  const db2 = new DatabaseSync(out);
  const g = (p) => db2.prepare(`PRAGMA ${p}`).get();
  const after = {
    bytes: (g("page_count").page_count - g("freelist_count").freelist_count) * g("page_size").page_size,
    fts: ["hadiths_fts_data", "hadiths_fts_idx", "hadiths_fts_docsize"].map((t) => db2.prepare(`select count(*) c from ${t}`).get().c),
    hadiths: db2.prepare("select count(*) c from hadiths").get().c,
  };
  const bc = db2.prepare("select count(*) c from book_chapter where book_id=?").get(cid).c;
  db2.close();
  stats.apply = {
    hadiths_before: before.hadiths, hadiths_after: after.hadiths, book_chapter_rows: bc,
    storage_delta_bytes: after.bytes - before.bytes,
    fts_shadow_rows_delta: { data: after.fts[0] - before.fts[0], idx: after.fts[1] - before.fts[1], docsize: after.fts[2] - before.fts[2] },
    est_turso_rows_written: {
      hadiths_inserts_row_plus_4_indexes: toInsert.length * 5,
      stub_updates: matchedRef.size * 5,
      seq_updates_row_plus_index_rewrite: (toInsert.length + matchedRef.size) * 3,
      fts_shadow_rows: (after.fts[0] - before.fts[0]) + (after.fts[1] - before.fts[1]) + (after.fts[2] - before.fts[2]),
      book_chapter_rows: bc, books_update: 3,
    },
  };
  stats.apply.est_turso_rows_written.total = Object.values(stats.apply.est_turso_rows_written).reduce((a, b) => a + b, 0);
}
writeFileSync(`${dir}/stats.json`, JSON.stringify(stats, null, 1));
console.log(JSON.stringify({ ...stats, gaps: stats.gaps, stubs: { total: stats.stubs.total, matched_unique: stats.stubs.matched_unique } }, null, 1));
