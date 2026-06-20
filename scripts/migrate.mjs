// Jalankan db/schema.sql pada Supabase/Postgres.
// Guna: node scripts/migrate.mjs   (perlu DATABASE_URL dalam env / .env.local)

import { readFileSync } from "node:fs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak diset (lihat .env.local)");
  const { default: pg } = await import("pg");
  const sql = readFileSync("db/schema.sql", "utf8");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Skema dijalankan (db/schema.sql).");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("RALAT:", e.message);
  process.exit(1);
});
