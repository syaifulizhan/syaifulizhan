// Backup SEMUA jadual Turso remote → fail SQL tempatan (reads sahaja; selamat walau
// writes diblok). Paginate ikut rowid supaya tahan jadual besar. Untuk seed akaun baharu.
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/turso-backup.mjs [out.sql]
import { createClient } from "@libsql/client";
import { writeFileSync, appendFileSync } from "node:fs";

const OUT = process.argv[2] || `data/turso-remote-backup/turso-remote-${new Date().toISOString().slice(0,10)}.sql`;
const db = createClient({ url: process.env.TURSO_SYNC_URL, authToken: process.env.TURSO_SYNC_TOKEN });
const PAGE = 4000;

const esc = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const b = Buffer.from(v.buffer ?? v); return "X'" + b.toString("hex") + "'";
  }
  return "'" + String(v).replace(/'/g, "''") + "'";
};

writeFileSync(OUT, "PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n");
const tables = (await db.execute(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' AND name NOT LIKE '%_config' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_content'"
)).rows;

let grand = 0;
for (const t of tables) {
  const name = t.name;
  const cols = (await db.execute(`PRAGMA table_info("${name}")`)).rows.map(r => r.name);
  const collist = cols.map(c => `"${c}"`).join(",");
  appendFileSync(OUT, `\n-- ==== ${name} ====\nDROP TABLE IF EXISTS "${name}";\n${t.sql};\n`);
  let last = -1, n = 0;
  for (;;) {
    const r = await db.execute({
      sql: `SELECT rowid AS __rid, ${collist} FROM "${name}" WHERE rowid > ? ORDER BY rowid LIMIT ?`,
      args: [last, PAGE],
    });
    if (!r.rows.length) break;
    const lines = [];
    for (const row of r.rows) {
      last = Number(row.__rid);
      const vals = cols.map(c => esc(row[c])).join(",");
      lines.push(`INSERT INTO "${name}" (${collist}) VALUES (${vals});`);
    }
    appendFileSync(OUT, lines.join("\n") + "\n");
    n += r.rows.length;
    process.stdout.write(`\r  ${name}: ${n} baris   `);
  }
  console.log(`\r  ✓ ${name}: ${n} baris        `);
  grand += n;
}
appendFileSync(OUT, "COMMIT;\n");
console.log(`\n✓ Backup siap: ${OUT}  (${grand} baris, ${tables.length} jadual)`);
db.close();
