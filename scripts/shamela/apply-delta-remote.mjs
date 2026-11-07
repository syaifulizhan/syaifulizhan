#!/usr/bin/env node
// Apply (or roll back) an import-book.mjs delta bundle on the REAL corpus (Turso) from CI, or on a file: copy for tests.
//   node scripts/shamela/apply-delta-remote.mjs <bundle dir> --dry-run            preflight + plan (read-only token)
//   node scripts/shamela/apply-delta-remote.mjs <bundle dir> --apply [--resume]   preflight, write in batches, verify
//   node scripts/shamela/apply-delta-remote.mjs <bundle dir> --rollback [--dry-run] [--resume]
//   add `--db file:/path/copy.db` to target a local scratch copy instead of Turso (never data/corpus.db itself)
// Bundle: delta.sql, rollback.sql, rollback-backup.json, stats.json.
// Env (Turso): TURSO_API_TOKEN (required); TURSO_ORG / TURSO_DB (defaults as segar-seq.mjs). A 1 h DB token is minted:
// full-access for --apply/--rollback, read-only for --dry-run. Tokens are never printed.
// Safety model: preflight compares live rows with rollback-backup.json (src_ref + sha256 of matn) and aborts on ANY
// mismatch, so a prod DB that differs from the local corpus the bundle was generated against is refused before a write.
// Writes run as several atomic batches (each <= BATCH_BYTES); every statement is idempotent, so a half-finished run is
// resumed with --resume, or undone with --rollback.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const BATCH_BYTES = 800_000; // Hrana request bodies stay well under typical limits
const BATCH_STMTS = 400;
const SAMPLE = 24; // new-row existence probes (evenly spaced, plus first and last)
const sha = (s) => createHash("sha256").update(String(s ?? "")).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = /SERVER_ERROR|HTTP status [45]\d\d|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|network|stream|timed? ?out/i;

class Abort extends Error {}
const abort = (msg) => { throw new Abort(msg); };

/** Split SQL text into statements (quote-aware; `--` comments and BEGIN/COMMIT dropped). */
export function splitSql(text) {
  const out = [];
  let cur = "";
  const tok = /'(?:[^']|'')*'|--[^\n]*|;|[^';-]+|-/gy;
  let m;
  while ((m = tok.exec(text))) {
    const t = m[0];
    if (t === ";") { out.push(cur.trim()); cur = ""; } else if (!t.startsWith("--")) cur += t;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s && !/^(BEGIN|COMMIT)\b/i.test(s));
}

export function groupBatches(stmts) {
  const batches = [];
  let cur = [], bytes = 0;
  for (const s of stmts) {
    if (cur.length && (bytes + s.length > BATCH_BYTES || cur.length >= BATCH_STMTS)) { batches.push(cur); cur = []; bytes = 0; }
    cur.push(s); bytes += s.length;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

const kindOf = (s) => (s.match(/^(INSERT OR IGNORE INTO \w+|INSERT INTO \w+|UPDATE \w+|DELETE FROM \w+|WITH|ALTER TABLE \w+)/i)?.[1] ?? s.slice(0, 20)).replace(/\s+/g, " ");

function loadBundle(dir) {
  const read = (f) => readFileSync(`${dir}/${f}`, "utf8");
  const delta = splitSql(read("delta.sql"));
  const rollback = splitSql(read("rollback.sql"));
  const backup = JSON.parse(read("rollback-backup.json"));
  const stats = JSON.parse(read("stats.json"));
  const bookId = backup.book?.id;
  if (!Number.isInteger(bookId) || bookId !== stats.corpus_book) abort(`bundle inconsistent: backup book ${bookId} vs stats ${stats.corpus_book}`);
  const newRefs = delta.map((s) => s.match(/^INSERT OR IGNORE INTO hadiths \([^)]*\) VALUES \('(shamela:\d+:\d+(?::\d+)?)'/)?.[1]).filter(Boolean);
  const refMap = new Map(); // old stub src_ref -> new src_ref
  for (const s of delta) {
    const m = s.match(/^UPDATE hadiths SET src_ref='(shamela:\d+:\d+)'.*WHERE book_id=\d+ AND src_ref='([^']+)'$/s);
    if (m) refMap.set(m[2], m[1]);
  }
  const stubs = backup.hadiths.map((h) => ({ id: h.id, oldRef: h.src_ref, newRef: refMap.get(h.src_ref), hash: sha(h.matn_ar) }));
  if (stubs.some((s) => !s.newRef)) abort("a backed-up stub has no matching UPDATE in delta.sql");
  const prefix = stubs[0].newRef.replace(/\d+$/, "");
  if (newRefs.some((r) => !r.startsWith(prefix))) abort("delta mixes Shamela book prefixes");
  const expected = stubs.length + newRefs.length;
  if (stats.hadiths_importable !== expected) abort(`stats.hadiths_importable ${stats.hadiths_importable} != stubs+inserts ${expected}`);
  return { delta, rollback, backup, stats, bookId, newRefs, stubs, prefix, expected };
}

async function mintClient(access, dbOverride) {
  if (dbOverride) {
    if (!dbOverride.startsWith("file:") || /(^|\/)data\/corpus\.db$/.test(dbOverride)) abort("--db must be file: and not data/corpus.db (use a scratch copy)");
    return { client: createClient({ url: dbOverride }), where: dbOverride };
  }
  const token = process.env.TURSO_API_TOKEN;
  if (!token) abort("TURSO_API_TOKEN is not set");
  const org = process.env.TURSO_ORG || "syaifulizhan-thgzut";
  const name = process.env.TURSO_DB || "dewan-izhan-v3";
  const api = async (path, init = {}) => {
    const r = await fetch(`https://api.turso.tech/v1/organizations/${org}/databases/${name}${path}`, { ...init, headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) abort(`Turso API ${path.split("?")[0] || "/"}: HTTP ${r.status}`);
    return r.json();
  };
  const { database } = await api("");
  const { jwt } = await api(`/auth/tokens?expiration=1h&authorization=${access === "write" ? "full-access" : "read-only"}`, { method: "POST" });
  return { client: createClient({ url: `libsql://${database.Hostname}`, authToken: jwt }), where: `turso:${org}/${name} (${access === "write" ? "full-access" : "read-only"} 1h token)` };
}

const makeIo = (client) => {
  const io = { reads: 0, written: 0, batches: 0 };
  io.q = async (sql, args = []) => {
    const rs = await client.execute({ sql, args });
    io.reads += Math.max(1, rs.rows.length);
    return rs.rows;
  };
  io.batch = async (stmts) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const rss = await client.batch(stmts.map((sql) => ({ sql, args: [] })), "write");
        io.batches++;
        io.written += rss.reduce((n, r) => n + (r.rowsAffected || 0), 0);
        return;
      } catch (e) {
        if (attempt >= 2 || !TRANSIENT.test(String(e?.message ?? e))) throw e;
        await sleep(1000 * 3 ** attempt); // batch is atomic + idempotent, so a retry is safe
      }
    }
  };
  return io;
};

const inList = (n) => Array(n).fill("?").join(",");
const probeRefs = (refs) => {
  if (refs.length <= SAMPLE) return refs;
  const idx = new Set([0, refs.length - 1]);
  for (let i = 1; i < SAMPLE - 1; i++) idx.add(Math.floor((i * (refs.length - 1)) / (SAMPLE - 1)));
  return [...idx].sort((a, b) => a - b).map((i) => refs[i]);
};

/** Read-only checks. Returns { state: "clean"|"applied"|"partial", needsColumn, notes[] }; throws Abort on any mismatch. */
async function preflight(io, b) {
  const notes = [];
  const names = (await io.q(`SELECT name, sql FROM sqlite_master WHERE name IN ('hadiths','books','book_chapter','hadith_narrators','hadiths_fts','hadiths_fts_docsize')`));
  const have = new Map(names.map((r) => [r.name, r.sql]));
  for (const n of ["hadiths", "books", "book_chapter", "hadith_narrators", "hadiths_fts", "hadiths_fts_docsize"]) if (!have.has(n)) abort(`table ${n} missing`);
  if (!/content\s*=\s*'hadiths'/.test(have.get("hadiths_fts")) || !/content_rowid\s*=\s*'id'/.test(have.get("hadiths_fts"))) abort("hadiths_fts is not an external-content FTS on hadiths(id): delta FTS statements would corrupt it");
  notes.push("tables + FTS names/definition match");

  const cols = await io.q(`SELECT name FROM pragma_table_info('books')`);
  const needsColumn = !cols.some((c) => c.name === "numbering_edition");
  notes.push(needsColumn ? "books.numbering_edition missing (will be added)" : "books.numbering_edition present");

  const book = (await io.q(`SELECT id, title_ar, total_hadith FROM books WHERE id=?`, [b.bookId]))[0];
  if (!book) abort(`book ${b.bookId} not found`);
  if (book.title_ar !== b.backup.book.title_ar) abort(`book ${b.bookId} title differs from backup`);
  notes.push(`book ${b.bookId} row found (total_hadith=${book.total_hadith})`);

  const ids = b.stubs.map((s) => s.id);
  const rows = await io.q(`SELECT id, src_ref, matn_ar FROM hadiths WHERE book_id=? AND id IN (${inList(ids.length)})`, [b.bookId, ...ids]);
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  let nOld = 0, nNew = 0;
  for (const s of b.stubs) {
    const r = byId.get(Number(s.id));
    if (!r) abort(`stub id ${s.id} missing from book ${b.bookId}`);
    if (r.src_ref === s.oldRef && sha(r.matn_ar) === s.hash) nOld++;
    else if (r.src_ref === s.newRef) nNew++;
    else abort(`stub id ${s.id} matches neither backup (${s.oldRef}) nor delta (${s.newRef}): src_ref=${r.src_ref}, matn sha ${sha(r.matn_ar).slice(0, 12)} vs ${s.hash.slice(0, 12)}`);
  }
  notes.push(`stubs: ${nOld} original (src_ref+matn hash match backup), ${nNew} already updated`);

  const probes = probeRefs(b.newRefs);
  const found = (await io.q(`SELECT src_ref FROM hadiths WHERE src_ref IN (${inList(probes.length)})`, probes)).length;
  notes.push(`new rows: ${found}/${probes.length} probed already exist`);

  if (nOld === b.stubs.length && found === 0) {
    const extra = await io.q(`SELECT id FROM hadiths WHERE book_id=? AND id NOT IN (${inList(ids.length)}) LIMIT 1`, [b.bookId, ...ids]);
    if (extra.length) abort(`book ${b.bookId} already holds rows beyond the backed-up stubs (id ${extra[0].id}): prod differs from the bundle's source`);
    if (Number(book.total_hadith) !== Number(b.backup.book.total_hadith)) abort(`books.total_hadith ${book.total_hadith} != backup ${b.backup.book.total_hadith}`);
    const links = Number((await io.q(`SELECT count(*) AS n FROM hadith_narrators WHERE hadith_id IN (${inList(ids.length)})`, ids))[0].n);
    if (links !== b.backup.narrator_links.length) abort(`stub narrator links ${links} != backup ${b.backup.narrator_links.length}`);
    notes.push(`book holds only the ${ids.length} stubs; narrator links ${links} match backup`);
    return { state: "clean", needsColumn, notes };
  }
  if (nNew === b.stubs.length && found === probes.length) return { state: "applied", needsColumn, notes };
  return { state: "partial", needsColumn, notes };
}

/** Post-write verification (apply). Throws Abort listing every failed check. */
async function verifyApplied(io, b, log) {
  const bad = [];
  const check = (label, ok, detail) => { log(`  ${ok ? "ok  " : "FAIL"} ${label}: ${detail}`); if (!ok) bad.push(label); };
  const n = b.expected;
  const book = (await io.q(`SELECT total_hadith, chapter_count, numbering_edition FROM books WHERE id=?`, [b.bookId]))[0];
  check("books.total_hadith", Number(book.total_hadith) === n, `${book.total_hadith} (expected ${n})`);
  check("books.numbering_edition", !!book.numbering_edition, book.numbering_edition ? "set" : "NULL");
  const span = (await io.q(`SELECT min(seq) AS lo, max(seq) AS hi FROM hadiths WHERE book_id=?`, [b.bookId]))[0];
  check("seq span", Number(span.lo) === 1 && Number(span.hi) === n, `${span.lo}..${span.hi}`);
  const inRange = Number((await io.q(`SELECT count(*) AS n FROM hadiths WHERE book_id=? AND seq BETWEEN 1 AND ?`, [b.bookId, n]))[0].n);
  check("hadiths in seq range (idx_hadiths_book_seq)", inRange === n, `${inRange} (expected ${n})`);
  const chapters = Number((await io.q(`SELECT count(*) AS n FROM book_chapter WHERE book_id=?`, [b.bookId]))[0].n);
  check("book_chapter rows = books.chapter_count", chapters > 0 && chapters === Number(book.chapter_count), `${chapters} vs ${book.chapter_count}`);
  const fts = Number((await io.q(`SELECT count(*) AS n FROM hadiths h JOIN hadiths_fts_docsize d ON d.id = h.id WHERE h.book_id=?`, [b.bookId]))[0].n);
  check("FTS rows for the book's hadiths", fts === n, `${fts} (expected ${n})`);
  const last = (await io.q(`SELECT id, matn_search FROM hadiths WHERE book_id=? AND seq=?`, [b.bookId, n]))[0];
  const words = String(last?.matn_search ?? "").split(/\s+/).filter((w) => w.length > 2).slice(0, 3);
  const hit = words.length ? (await io.q(`SELECT rowid FROM hadiths_fts WHERE hadiths_fts MATCH ? AND rowid=?`, [words.map((w) => `"${w.replace(/"/g, "")}"`).join(" AND "), last.id])).length : 0;
  check("FTS MATCH finds last hadith", hit === 1, words.join(" ") || "no words");
  if (bad.length) abort(`verification failed: ${bad.join("; ")}`);
}

async function verifyRolledBack(io, b, log) {
  const bad = [];
  const check = (label, ok, detail) => { log(`  ${ok ? "ok  " : "FAIL"} ${label}: ${detail}`); if (!ok) bad.push(label); };
  const book = (await io.q(`SELECT total_hadith, numbering_edition FROM books WHERE id=?`, [b.bookId]))[0];
  check("books.total_hadith restored", Number(book.total_hadith) === Number(b.backup.book.total_hadith), `${book.total_hadith}`);
  check("books.numbering_edition cleared", book.numbering_edition == null, String(book.numbering_edition));
  const ids = b.stubs.map((s) => s.id);
  const rows = await io.q(`SELECT id, src_ref, matn_ar FROM hadiths WHERE id IN (${inList(ids.length)})`, ids);
  const okStubs = b.stubs.every((s) => rows.some((r) => Number(r.id) === Number(s.id) && r.src_ref === s.oldRef && sha(r.matn_ar) === s.hash));
  check("stubs equal backup (src_ref + matn hash)", okStubs, `${rows.length} rows`);
  const stray = await io.q(`SELECT src_ref FROM hadiths WHERE src_ref >= ? AND src_ref < ? LIMIT 1`, [b.prefix, b.prefix.slice(0, -1) + ";"]);
  check("no imported rows remain", stray.length === 0, stray[0]?.src_ref ?? "none");
  const links = Number((await io.q(`SELECT count(*) AS n FROM hadith_narrators WHERE hadith_id IN (${inList(ids.length)})`, ids))[0].n);
  check("stub narrator links restored", links === b.backup.narrator_links.length, `${links}`);
  const fts = Number((await io.q(`SELECT count(*) AS n FROM hadiths_fts_docsize WHERE id IN (${inList(ids.length)})`, ids))[0].n);
  check("stubs present in FTS", fts === ids.length, `${fts}`);
  if (bad.length) abort(`rollback verification failed: ${bad.join("; ")}`);
}

export async function main(argv, log = console.log) {
  const args = [...argv];
  const flag = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
  const opt = (n) => { const i = args.indexOf(n); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const dbOverride = opt("--db");
  const dry = flag("--dry-run"), apply = flag("--apply"), rollback = flag("--rollback"), resume = flag("--resume");
  const dir = args[0];
  if (!dir || args.length !== 1 || (rollback ? apply : dry === apply)) {
    log("usage: apply-delta-remote.mjs <bundle dir> (--dry-run | --apply [--resume] | --rollback [--dry-run] [--resume]) [--db file:copy.db]");
    return 2;
  }
  const writing = !dry;
  const b = loadBundle(dir);
  const sqls = rollback ? b.rollback : b.delta;
  const batches = groupBatches(sqls);
  const kinds = {};
  for (const s of sqls) kinds[kindOf(s)] = (kinds[kindOf(s)] ?? 0) + 1;
  const mode = rollback ? (dry ? "ROLLBACK dry-run" : "ROLLBACK") : dry ? "APPLY dry-run" : "APPLY";
  let session;
  try { session = await mintClient(writing ? "write" : "read", dbOverride); } catch (e) { log(`FAILED: ${e?.message ?? e}`); return 1; }
  const { client, where } = session;
  const io = makeIo(client);
  log(`== ${mode}: book ${b.bookId} (${b.stats.shamela_title}) <- ${where}`);
  log(`bundle: ${sqls.length} statements, ${batches.length} batches, ${(sqls.reduce((n, s) => n + s.length, 0) / 1e6).toFixed(2)} MB; expected ${b.expected} hadiths after apply`);
  try {
    const pf = await preflight(io, b);
    log("preflight:");
    for (const n of pf.notes) log(`  - ${n}`);
    log(`state: ${pf.state}`);
    const est = b.stats.apply?.est_turso_rows_written?.total;
    log(`plan: ${Object.entries(kinds).map(([k, v]) => `${v}x ${k}`).join(", ")}`);
    const estText = rollback ? "~8.3k (measured on the local test copy)" : `~${est ?? "n/a"} (importer estimate: rows + 4 indexes, seq rewrite, FTS shadow, chapters)`;
    log(`estimated rows written: ${estText}; preflight rows read: ~${io.reads}; verify adds ~10k reads (index range counts)`);

    if (rollback ? pf.state === "clean" : pf.state === "applied") {
      log(rollback ? "nothing to roll back: DB already equals the pre-import backup." : "already applied (all stubs updated, all probed rows exist): no writes.");
      if (!dry && !rollback) { log("verify:"); await verifyApplied(io, b, log); }
      log(`rows read ~${io.reads}, written 0`);
      return 0;
    }
    if (pf.state === "partial" && !resume && !(rollback)) abort("DB is in a PARTIAL state (interrupted earlier run). Re-run with --resume, or use --rollback.");
    if (dry) { log("dry-run: no writes performed."); return 0; }

    if (pf.needsColumn) { log("adding books.numbering_edition (idempotent)"); await client.execute("ALTER TABLE books ADD COLUMN numbering_edition TEXT"); }
    let i = 0;
    for (const batch of batches) {
      i++;
      await io.batch(batch);
      if (i % 5 === 0 || i === batches.length) log(`  batch ${i}/${batches.length} committed (${io.written} rows affected so far)`);
    }
    log("verify:");
    if (rollback) await verifyRolledBack(io, b, log); else await verifyApplied(io, b, log);
    log(`DONE: ${batches.length} batches, rows affected ${io.written} (rowsAffected excludes index/FTS writes), rows read ~${io.reads} (counted from returned rows; index scans in SQL not included)`);
    if (!rollback) log("REMINDER: bump scripts/static-data-version.txt (in-place stub edits do not change max(rowid)).");
    return 0;
  } catch (e) {
    log(`FAILED: ${e instanceof Abort ? e.message : e?.message ?? e}`);
    if (writing && io.batches > 0 && io.batches < batches.length) log(`State may be partial (${io.batches}/${batches.length} batches committed). Re-run with --resume, or undo with: node scripts/shamela/apply-delta-remote.mjs ${dir} --rollback`);
    else if (writing && io.batches === 0) log("No batch committed before the failure (nothing was written).");
    return 1;
  } finally {
    client.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
