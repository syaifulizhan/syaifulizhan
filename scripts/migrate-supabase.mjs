// Jalankan db/supabase.sql pada Supabase/Postgres (skema moderasi).
// Guna: node --env-file=.env.local scripts/migrate-supabase.mjs
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL tidak diset (lihat .env.local)");

const { default: pg } = await import("pg");
const sql = readFileSync("db/supabase.sql", "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  const r = await client.query(
    "select count(*)::int n from public.correction_suggestions"
  );
  console.log(`✓ Skema moderasi dijalankan. public.correction_suggestions (baris: ${r.rows[0].n}).`);
} finally {
  await client.end();
}
