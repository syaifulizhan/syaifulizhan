// Seed glosari kurasi (GLOSSARY_DATA) ke jadual glossary.
//   node scripts/glossary-seed.mjs
import { createClient } from "@libsql/client";
import { GLOSSARY_DATA } from "./lib/glossary.mjs";
import { normalizeArabic } from "./lib/arabic.mjs";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute("DROP TABLE IF EXISTS glossary");
await db.execute(`CREATE TABLE glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar TEXT UNIQUE,
  huruf TEXT,
  term_search TEXT,
  translit TEXT,
  term_ms TEXT,
  term_en TEXT,
  def_ar TEXT,
  def_ms TEXT,
  def_en TEXT,
  source TEXT DEFAULT 'kurasi'
)`);

let n = 0;
for (const g of GLOSSARY_DATA) {
  const norm = normalizeArabic(g.ar);
  await db.execute({
    sql: `INSERT OR IGNORE INTO glossary (term_ar,huruf,term_search,translit,term_ms,term_en,def_ar,def_ms,def_en)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [g.ar, norm[0] ?? "", norm, g.tr, g.ms, g.en, g.dar ?? null, g.dms, g.den],
  });
  n++;
}
console.log(`✓ Glosari di-seed: ${n} istilah → ${process.env.TURSO_DATABASE_URL ? "Turso" : "tempatan"}`);
db.close();
