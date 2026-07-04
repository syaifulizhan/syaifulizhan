// GANTI Musnad Ahmad tak lengkap (AhmedBaset 1,374 hadis, bab 8–30 hilang) dgn set PENUH
// al-Maknaz dari mhashim6/Open-Hadith-Data (26,363 hadis, raqm 1–26,363 tiada jurang).
// BEDAH & LOKAL sahaja (data/corpus.db) — cloud disync berasingan.
// Amanah: simpan terjemahan lama via padanan matn ternormal; tulis manifest utk D1/Turso.
//   node scripts/import-musnad-ahmad.mjs [--write]
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeArabic } from "./lib/arabic.mjs";

const WRITE = process.argv.includes("--write");
const CSV = "data/mhashim-ahmad.csv"; // disalin dari repo mhashim6
const BOOK_ID = 900002;
const db = createClient({ url: "file:./data/corpus.db" });

// ── 1. baca + bersih CSV (buang RLM/LRM, mampat ruang, KEKAL tashkeel) ──
function parseCsv(txt) {
  const out = [];
  let i = 0, field = "", row = [], inQ = false;
  while (i < txt.length) {
    const c = txt[i];
    if (inQ) {
      if (c === '"' && txt[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ",") { row.push(field); field = ""; i++; }
      else if (c === "\r") { i++; }
      else if (c === "\n") { row.push(field); if (row.some((x) => x !== "")) out.push(row); row = []; field = ""; i++; }
      else { field += c; i++; }
    }
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x !== "")) out.push(row); }
  return out;
}
const clean = (s) => (s || "").replace(/[‎‏]/g, "").replace(/\s+/g, " ").trim();

const rows = parseCsv(readFileSync(CSV, "utf8"))
  .filter((r) => r[0] && /^\d+$/.test(r[0].trim()))
  .map((r) => ({ raqm: Number(r[0].trim()), matn: clean(r[1]) }))
  .filter((r) => r.matn.length > 10);
rows.sort((a, b) => a.raqm - b.raqm);
console.log(`CSV: ${rows.length} hadis · raqm ${rows[0].raqm}–${rows.at(-1).raqm}`);
const dupRaqm = rows.length - new Set(rows.map((r) => r.raqm)).size;
if (dupRaqm) { console.error(`⛔ ${dupRaqm} raqm pendua — BATAL`); process.exit(1); }

// ── 2. keadaan lama Ahmad ──
const old = await db.execute({ sql: "SELECT id, matn_ar FROM hadiths WHERE book_id=?", args: [BOOK_ID] });
const oldIds = old.rows.map((r) => Number(r.id));
console.log(`Ahmad lama: ${oldIds.length} hadis (id ${Math.min(...oldIds)}–${Math.max(...oldIds)})`);

// simpan terjemahan lama → peta matn-ternormal → senarai terjemahan
const transPreserve = new Map(); // normMatn → [{lang,text,source,model,is_verified}]
if (oldIds.length) {
  const oldMatnById = new Map(old.rows.map((r) => [Number(r.id), normalizeArabic(String(r.matn_ar))]));
  for (let i = 0; i < oldIds.length; i += 400) {
    const chunk = oldIds.slice(i, i + 400);
    const ph = chunk.map(() => "?").join(",");
    const tr = await db.execute({
      sql: `SELECT entity_id, lang, text, source, model, is_verified FROM translations
            WHERE entity_type='hadith' AND entity_id IN (${ph})`,
      args: chunk,
    });
    for (const t of tr.rows) {
      const nm = oldMatnById.get(Number(t.entity_id));
      if (!nm) continue;
      (transPreserve.get(nm) ?? transPreserve.set(nm, []).get(nm)).push({
        lang: String(t.lang), text: String(t.text), source: t.source ? String(t.source) : null,
        model: t.model ? String(t.model) : null, is_verified: Number(t.is_verified ?? 0),
      });
    }
  }
}
const nPreserve = [...transPreserve.values()].reduce((a, v) => a + v.length, 0);
console.log(`terjemahan lama disimpan (peta matn): ${nPreserve}`);

// ── 3. id baharu utk set penuh (di hujung jujukan, elak langgar) ──
const maxId = Number((await db.execute("SELECT COALESCE(MAX(id),0) m FROM hadiths")).rows[0].m);
let nid = maxId + 1;
const newRows = rows.map((r) => ({
  id: nid++, raqm: r.raqm, matn: r.matn, search: normalizeArabic(r.matn),
  src_ref: `maknaz:ahmad:${r.raqm}`,
}));
// padan terjemahan
let matched = 0;
const transInsert = [];
for (const nr of newRows) {
  const keep = transPreserve.get(nr.search);
  if (!keep) continue;
  for (const t of keep) { transInsert.push({ ...t, entity_id: nr.id }); matched++; }
}
console.log(`id baharu: ${newRows[0].id}–${newRows.at(-1).id} · terjemahan dipadan: ${matched}/${nPreserve}`);

console.log(`\nRINGKASAN:`);
console.log(`  hadiths: -${oldIds.length} +${newRows.length} (net ${newRows.length - oldIds.length})`);
console.log(`  translations Ahmad: buang lama, masuk ${transInsert.length}`);
console.log(`  hadith_narrators Ahmad lama akan DIBUANG (regen via enrich-hadith kemudian)`);

if (!WRITE) { console.log("\n(DRY — --write utk kemas LOKAL)"); db.close(); process.exit(0); }

// ── 4. tulis LOKAL (bedah, dlm kelompok) ──
console.log("\n→ Buang Ahmad lama…");
if (oldIds.length) {
  for (let i = 0; i < oldIds.length; i += 300) {
    const ph = oldIds.slice(i, i + 300).map(() => "?").join(",");
    await db.batch([
      { sql: `DELETE FROM translations WHERE entity_type='hadith' AND entity_id IN (${ph})`, args: oldIds.slice(i, i + 300) },
      { sql: `DELETE FROM hadith_narrators WHERE hadith_id IN (${ph})`, args: oldIds.slice(i, i + 300) },
      { sql: `DELETE FROM hadiths WHERE id IN (${ph})`, args: oldIds.slice(i, i + 300) },
    ], "write");
  }
}
console.log("→ Masuk Ahmad penuh…");
for (let i = 0; i < newRows.length; i += 300) {
  await db.batch(newRows.slice(i, i + 300).map((r) => ({
    sql: `INSERT INTO hadiths (id, src_ref, book_id, chapter_ref, chapter_ar, number, matn_ar, matn_search, scraped_at)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [r.id, r.src_ref, BOOK_ID, null, null, r.raqm, r.matn, r.search, new Date().toISOString()],
  })), "write");
  process.stdout.write(`\r  ${Math.min(i + 300, newRows.length)}/${newRows.length}`);
}
console.log("\n→ Masuk terjemahan dipadan…");
for (let i = 0; i < transInsert.length; i += 300) {
  await db.batch(transInsert.slice(i, i + 300).map((t) => ({
    sql: `INSERT OR IGNORE INTO translations (entity_type, entity_id, lang, text, source, model, is_verified, created_at)
          VALUES ('hadith',?,?,?,?,?,?,?)`,
    args: [t.entity_id, t.lang, t.text, t.source, t.model, t.is_verified, new Date().toISOString()],
  })), "write");
}
console.log("→ Rebuild hadiths_fts…");
await db.execute("INSERT INTO hadiths_fts(hadiths_fts) VALUES('rebuild')");

// manifest utk sync cloud (D1 hadiths + translations)
writeFileSync("scripts/_ahmad-newids.json", JSON.stringify({
  book_id: BOOK_ID, oldIds, newIds: newRows.map((r) => r.id), when: new Date().toISOString(),
}));
console.log("✓ LOKAL siap. Manifest: scripts/_ahmad-newids.json");
db.close();
