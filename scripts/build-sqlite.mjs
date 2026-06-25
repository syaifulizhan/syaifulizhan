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
const NARRATORS_FILES = [NARRATORS, "data/islamdb/narrators.recovered.jsonl", "data/itqan/narrators.itqan.jsonl"];
const ITQAN_GRADES = "data/itqan/grades.itqan.jsonl";
const ITQAN_RELATIONS = "data/itqan/relations.itqan.jsonl";
const ITQAN_ENRICH = "data/itqan/enrich.itqan.jsonl";
const HADITH_FILES = [HADITH, "data/islamdb/hadith.recovered.jsonl", "data/islamdb/ahmedbaset.jsonl"];

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
  await db.execute("DELETE FROM narrators WHERE id>=2000000"); // bersih julat Itqan → padanan terkini berkuat kuasa (buang sisa build lama)

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

  // ── Pas 3: Itqan — gred perkaya (perawi islam-db) + tepi guru/murid TEPAT (id) ──
  let itqG = 0, itqE = 0;
  if (existsSync(ITQAN_GRADES)) {
    console.log("→ Pas 3a: gred Itqan (perkaya perawi sedia ada)…");
    batch = [];
    for await (const g of readJsonl(ITQAN_GRADES)) {
      batch.push({ sql: `INSERT INTO narrator_grades (narrator_id,scholar,verdict) VALUES (?,?,?)`,
        args: [g.narrator_id, g.scholar ?? null, g.verdict ?? null] });
      itqG++;
      if (batch.length >= 400) await flush();
    }
    await flush();
  }
  if (existsSync(ITQAN_RELATIONS)) {
    console.log("→ Pas 3b: tepi guru/murid tepat Itqan…");
    batch = [];
    for await (const e of readJsonl(ITQAN_RELATIONS)) {
      batch.push({ sql: `INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)`,
        args: [e.teacher_id, e.student_id] });
      itqE++;
      if (batch.length >= 400) await flush();
    }
    await flush();
  }
  // ── Pas 3c: perkaya medan kosong perawi islam-db (wafat/kota dari Itqan) ──
  let itqF = 0;
  if (existsSync(ITQAN_ENRICH)) {
    console.log("→ Pas 3c: perkaya medan (wafat/kota) perawi islam-db…");
    batch = [];
    for await (const e of readJsonl(ITQAN_ENRICH)) {
      batch.push({
        sql: `UPDATE narrators SET death_year=COALESCE(death_year,?), death_place=COALESCE(death_place,?), regions=COALESCE(regions,?) WHERE id=?`,
        args: [e.death_year ?? null, e.death_place ?? null, e.regions ?? null, e.id],
      });
      itqF++;
      if (batch.length >= 400) await flush();
    }
    await flush();
  }
  if (itqG || itqE || itqF) console.log(`✓ Itqan: gred perkaya ${itqG} | tepi tepat ${itqE} | medan perkaya ${itqF}`);

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
  // KEKALKAN src_ref→id sedia ada supaya id hadis STABIL antara build → terjemahan
  // (source='ai': BM/EN) yg dikunci pada entity_id tak tersilap padan bila korpus membesar.
  const idBySrc = new Map();
  let maxId = 0;
  {
    let cur = 0;
    for (;;) {
      const r = await db.execute({ sql: "SELECT id, src_ref FROM hadiths WHERE id>? ORDER BY id LIMIT 5000", args: [cur] });
      if (!r.rows.length) break;
      for (const row of r.rows) { idBySrc.set(row.src_ref, Number(row.id)); if (Number(row.id) > maxId) maxId = Number(row.id); cur = Number(row.id); }
    }
  }
  console.log(`  (kekal stabil: ${idBySrc.size} id sedia ada, maxId=${maxId})`);

  await db.execute("DELETE FROM hadiths");
  await db.execute("DELETE FROM hadith_narrators");
  await db.execute("DELETE FROM translations WHERE source='AhmedBaset'"); // di-derive semula tiap build (kekalkan source='ai')

  let nH = 0, nLink = 0, nEdge = 0, nBook = 0, nEnTr = 0;
  const seen = new Set();
  let batch = [];
  const flush = async () => { if (batch.length) { await db.batch(batch, "write"); batch = []; } };

  for await (const r of readMany(HADITH_FILES)) {
    if (r.type === "book") {
      batch.push({
        sql: `INSERT INTO books (id,title_ar,title_en,author_ar,source) VALUES (?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET title_ar=excluded.title_ar, title_en=excluded.title_en, author_ar=excluded.author_ar, source=excluded.source`,
        args: [r.id, r.title, r.title_en ?? null, r.author_ar ?? null, r.source ?? "islamdb"],
      });
      nBook++;
    } else if (r.type === "hadith") {
      const src = r.src_ref ?? `${r.book}:${r.chapter}:${r.seq}`;
      if (seen.has(src)) continue; // dedupe re-scrape
      seen.add(src);
      const id = idBySrc.get(src) ?? ++maxId; // id stabil (sedia ada) atau baharu lepas max
      batch.push({
        sql: `INSERT INTO hadiths (id,src_ref,book_id,chapter_ref,chapter_ar,number,matn_ar,matn_search,scraped_at)
              VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
        args: [id, src, r.book, r.chapter, r.chapter_ar ?? null, r.seq, r.matn_ar, normalizeArabic(r.matn_ar || "")],
      });
      nH++;
      // Terjemahan EN sahih AhmedBaset (jika ada)
      if (r.en) {
        batch.push({
          sql: `INSERT INTO translations (entity_type,entity_id,lang,text,source,is_verified,created_at)
                VALUES ('hadith',?,'en',?,'AhmedBaset',1,datetime('now'))
                ON CONFLICT(entity_type,entity_id,lang,source) DO UPDATE SET text=excluded.text`,
          args: [id, r.en],
        });
        nEnTr++;
      }
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

  // ── Dedup: AhmedBaset menang. Padam kitab islam-db yang tajuknya sama. ──
  const abTitles = new Set(
    (await db.execute("SELECT title_ar FROM books WHERE source='ahmedbaset'")).rows.map((b) => normalizeArabic(b.title_ar))
  );
  let dedup = 0;
  if (abTitles.size) {
    const idb = (await db.execute("SELECT id,title_ar FROM books WHERE source IS NULL OR source='islamdb'")).rows;
    for (const b of idb) {
      if (abTitles.has(normalizeArabic(b.title_ar))) {
        await db.execute({ sql: "DELETE FROM hadith_narrators WHERE hadith_id IN (SELECT id FROM hadiths WHERE book_id=?)", args: [b.id] });
        await db.execute({ sql: "DELETE FROM hadiths WHERE book_id=?", args: [b.id] });
        await db.execute({ sql: "DELETE FROM books WHERE id=?", args: [b.id] });
        dedup++;
      }
    }
  }

  await db.execute(`INSERT INTO hadiths_fts(hadiths_fts) VALUES('rebuild')`);
  await db.execute(`INSERT INTO meta(key,value) VALUES('hadith_built_at', datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  console.log(`✓ Kitab: ${nBook} | Hadis: ${nH} | pautan isnad: ${nLink} | tepi isnad: ${nEdge}`);
  console.log(`✓ Terjemahan EN AhmedBaset: ${nEnTr} | Dedup kitab islam-db: ${dedup}`);
}

// libsql dayakan FK secara lalai; matikan utk import (rujukan tergantung dibenarkan —
// cth perawi dlm isnad/graf yang belum di-scrape akan resolve bila korpus membesar).
await db.execute("PRAGMA foreign_keys = OFF");
const ONLY_NARR = process.argv.includes("--narrators-only");
await buildNarrators();
if (!ONLY_NARR) await buildHadiths();
db.close();
