// Bina korpus SQLite/libSQL dari JSONL hasil scrape.
// Idempoten: jadual terbitan (grades, relations) dikosongkan dahulu; narrators di-upsert.
// Tepi graf guru/murid dibina dgn PADAN NAMA (href panel islam-db buggy → id tak guna).
//   node --env-file=.env.local scripts/build-sqlite.mjs
import { createClient } from "@libsql/client";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeArabic } from "./lib/arabic.mjs";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const db = createClient({ url, authToken });

const NARRATORS = "data/islamdb/narrators.jsonl";
const HADITH = "data/islamdb/hadith.jsonl";

async function* readJsonl(file) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (t) {
      try { yield JSON.parse(t); } catch { /* baris separa semasa scrape — langkau */ }
    }
  }
}

// Baca fail utama + fail recovered (dari retry-failed) sekali.
async function* readMany(files) {
  for (const f of files) if (existsSync(f)) yield* readJsonl(f);
}
const NARRATORS_FILES = [NARRATORS, "data/islamdb/narrators.recovered.jsonl"];
const HADITH_FILES = [HADITH, "data/islamdb/hadith.recovered.jsonl"];

async function buildNarrators() {
  if (!existsSync(NARRATORS)) {
    console.log(`(tiada ${NARRATORS} — langkau perawi)`);
    return;
  }
  await db.execute(
    `CREATE VIRTUAL TABLE IF NOT EXISTS narrators_fts USING fts5(name_search, content='narrators', content_rowid='id')`
  );
  await db.execute("DELETE FROM narrator_grades");
  await db.execute("DELETE FROM narrator_relations");

  // ── Pas 1: import perawi + jarh ──────────────────────────────────────────
  console.log("→ Pas 1: import perawi + jarh…");
  let nN = 0, nG = 0;
  let batch = [];
  const flush = async () => { if (batch.length) { await db.batch(batch, "write"); batch = []; } };
  for await (const n of readMany(NARRATORS_FILES)) {
    batch.push({
      sql: `INSERT INTO narrators
              (id,name_ar,name_search,shuhra,kunya,nisba,rutbah,profession,regions,mawla,death_year,death_place,bio_ar,scraped_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              name_ar=excluded.name_ar, name_search=excluded.name_search, shuhra=excluded.shuhra,
              kunya=excluded.kunya, nisba=excluded.nisba, rutbah=excluded.rutbah,
              profession=excluded.profession, regions=excluded.regions, mawla=excluded.mawla,
              death_year=excluded.death_year, death_place=excluded.death_place, bio_ar=excluded.bio_ar`,
      args: [n.id, n.name_ar, normalizeArabic(n.name_ar || ""), n.shuhra ?? null, n.kunya ?? null,
        n.nisba ?? null, n.rutbah ?? null, n.profession ?? null, n.regions ?? null, n.mawla ?? null,
        n.death_year ?? null, n.death_place ?? null, n.bio_ar ?? null],
    });
    nN++;
    for (const g of n.grades || []) {
      batch.push({ sql: `INSERT INTO narrator_grades (narrator_id,scholar,verdict) VALUES (?,?,?)`,
        args: [n.id, g.scholar ?? null, g.verdict ?? null] });
      nG++;
    }
    if (batch.length >= 400) await flush();
  }
  await flush();
  await db.execute(`INSERT INTO narrators_fts(narrators_fts) VALUES('rebuild')`);

  // ── Bina peta nama → id (untuk resolusi tepi graf) ───────────────────────
  console.log("→ Bina peta nama→id…");
  const nameMap = new Map(); // name_search → [id,…]
  let cursor = 0;
  for (;;) {
    const r = await db.execute({
      sql: "SELECT id, name_search FROM narrators WHERE id > ? ORDER BY id LIMIT 5000",
      args: [cursor],
    });
    if (!r.rows.length) break;
    for (const row of r.rows) {
      const k = row.name_search;
      if (!k) continue;
      (nameMap.get(k) ?? nameMap.set(k, []).get(k)).push(Number(row.id));
      cursor = Number(row.id);
    }
  }
  const resolve = (name) => {
    const ids = nameMap.get(normalizeArabic(name || ""));
    return ids && ids.length === 1 ? ids[0] : null; // unik sahaja (elak tepi palsu)
  };

  // ── Pas 2: resolve & masukkan tepi graf ──────────────────────────────────
  console.log("→ Pas 2: bina tepi graf (padan nama unik)…");
  let edges = 0, ambiguous = 0, unmatched = 0;
  batch = [];
  for await (const n of readMany(NARRATORS_FILES)) {
    const add = (teacherId, studentId) => {
      if (teacherId && studentId && teacherId !== studentId) {
        batch.push({ sql: `INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)`, args: [teacherId, studentId] });
        edges++;
      }
    };
    for (const t of n.teachers || []) {
      const tid = resolve(t.name);
      if (tid) add(tid, n.id);
      else if (nameMap.has(normalizeArabic(t.name || ""))) ambiguous++; else unmatched++;
    }
    for (const s of n.students || []) {
      const sid = resolve(s.name);
      if (sid) add(n.id, sid);
      else if (nameMap.has(normalizeArabic(s.name || ""))) ambiguous++; else unmatched++;
    }
    if (batch.length >= 400) await flush();
  }
  await flush();

  await db.execute(
    `INSERT INTO meta(key,value) VALUES('narrators_built_at', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  );
  console.log(`✓ Perawi: ${nN} | jarh: ${nG}`);
  console.log(`✓ Tepi graf: ${edges} unik | ambiguous(nama tak unik): ${ambiguous} | tak padan(belum di-scrape?): ${unmatched}`);
}

async function buildHadiths() {
  if (!existsSync(HADITH)) { console.log(`(tiada ${HADITH} — langkau hadis)`); return; }
  console.log("→ Import hadis + isnad…");
  await db.execute(
    `CREATE VIRTUAL TABLE IF NOT EXISTS hadiths_fts USING fts5(matn_search, content='hadiths', content_rowid='id')`
  );
  await db.execute("DELETE FROM hadiths");
  await db.execute("DELETE FROM hadith_narrators");

  let hid = 0, nH = 0, nLink = 0, nEdge = 0, nBook = 0;
  const seen = new Set();
  let batch = [];
  const flush = async () => { if (batch.length) { await db.batch(batch, "write"); batch = []; } };

  for await (const r of readMany(HADITH_FILES)) {
    if (r.type === "book") {
      batch.push({ sql: `INSERT INTO books (id,title_ar) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET title_ar=excluded.title_ar`, args: [r.id, r.title] });
      nBook++;
    } else if (r.type === "hadith") {
      const src = `${r.book}:${r.chapter}:${r.seq}`;
      if (seen.has(src)) continue; // dedupe re-scrape
      seen.add(src);
      const id = ++hid;
      batch.push({
        sql: `INSERT INTO hadiths (id,src_ref,book_id,chapter_ref,chapter_ar,number,matn_ar,matn_search,scraped_at)
              VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
        args: [id, src, r.book, r.chapter, r.chapter_ar ?? null, r.seq, r.matn_ar, normalizeArabic(r.matn_ar || "")],
      });
      nH++;
      const chain = r.chain || [];
      for (let i = 0; i < chain.length; i++) {
        batch.push({ sql: `INSERT INTO hadith_narrators (hadith_id,narrator_id,position,raw_name) VALUES (?,?,?,?)`, args: [id, chain[i].id, i, chain[i].name ?? null] });
        nLink++;
        // tepi isnad (id BETUL): chain[i] dengar dari chain[i+1] → guru=chain[i+1], murid=chain[i]
        if (i + 1 < chain.length) {
          batch.push({ sql: `INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)`, args: [chain[i + 1].id, chain[i].id] });
          nEdge++;
        }
      }
    }
    if (batch.length >= 400) await flush();
  }
  await flush();
  await db.execute(`INSERT INTO hadiths_fts(hadiths_fts) VALUES('rebuild')`);
  await db.execute(`INSERT INTO meta(key,value) VALUES('hadith_built_at', datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  console.log(`✓ Kitab: ${nBook} | Hadis: ${nH} | pautan isnad: ${nLink} | tepi isnad: ${nEdge}`);
}

// libsql dayakan FK secara lalai; matikan utk import (rujukan tergantung dibenarkan —
// cth perawi dlm isnad/graf yang belum di-scrape akan resolve bila korpus membesar).
await db.execute("PRAGMA foreign_keys = OFF");
await buildNarrators();
await buildHadiths();
db.close();
