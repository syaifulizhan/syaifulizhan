// Cipta skema korpus dalam SQLite/libSQL.
// Tempatan : node scripts/migrate-corpus.mjs           (→ data/corpus.db)
// Turso    : TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-corpus.mjs
import { createClient } from "@libsql/client";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// pastikan folder wujud untuk fail tempatan
if (url.startsWith("file:")) {
  const p = resolve(url.slice("file:".length));
  mkdirSync(dirname(p), { recursive: true });
}

const sql = readFileSync(new URL("../db/corpus.sql", import.meta.url), "utf8");
// pisah ikut ';' — buang chunk yang tiada SQL sebenar (komen sahaja).
// Komen baris (--...) dibiar dalam chunk; SQLite terima.
const stmts = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.replace(/--.*$/gm, "").trim().length > 0);

const db = createClient({ url, authToken });
let n = 0;
for (const s of stmts) {
  await db.execute(s);
  n++;
}
const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log(`✓ Skema korpus dijalankan (${n} penyata) → ${url}`);
console.log("Jadual:", tables.rows.map((r) => r.name).join(", "));
db.close();
