// Auto-kesan istilah teknikal (rutbah jarh wa ta'dil) dalam korpus yang belum ada
// dalam glosari, masukkan placeholder (term_ms/definition_ms diisi kemudian via OCR kamus).
// Jalankan selepas setiap corpus:build untuk tangkap istilah baharu.
//   node --env-file=.env.local scripts/glossary-sync.mjs
import { createClient } from "@libsql/client";
import { normalizeArabic } from "./lib/arabic.mjs";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`CREATE TABLE IF NOT EXISTS glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar TEXT UNIQUE, term_search TEXT, term_ms TEXT, definition_ms TEXT,
  source TEXT DEFAULT 'kamus', page INTEGER)`);

// Sumber istilah: rutbah perawi (boleh tambah grade hadis kelak).
const terms = (await db.execute(
  "SELECT DISTINCT trim(rutbah) t FROM narrators WHERE rutbah IS NOT NULL AND trim(rutbah) <> ''"
)).rows.map((r) => r.t);

let added = 0;
for (const term of terms) {
  const res = await db.execute({
    sql: `INSERT OR IGNORE INTO glossary (term_ar, term_search, source) VALUES (?,?,'rutbah')`,
    args: [term, normalizeArabic(term)],
  });
  if (res.rowsAffected) added++;
}

const total = (await db.execute("SELECT count(*) c FROM glossary")).rows[0].c;
const todo = (await db.execute("SELECT count(*) c FROM glossary WHERE term_ms IS NULL")).rows[0].c;
console.log(`✓ Glosari: +${added} istilah baharu · jumlah ${total} · ${todo} menunggu takrif (OCR kamus).`);
db.close();
