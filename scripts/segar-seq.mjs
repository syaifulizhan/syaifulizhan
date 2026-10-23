#!/usr/bin/env node
/**
 * Jalankan db/migrations/2026-10-23-bacaan-murah.sql — idempoten.
 *
 * Guna pertama kali untuk memasang `hadiths.seq`, `book_chapter` dan indeks; guna
 * SEMULA selepas sebarang import hadis baharu (hadis tanpa seq tidak muncul di
 * muka kitab, dan total_hadith/book_chapter akan lapuk).
 *
 * Melaporkan rows_read / rows_written SEBENAR setiap pernyataan (dari respons
 * Hrana Turso), supaya kos sentiasa diukur, bukan diteka.
 *
 *   node scripts/segar-seq.mjs                 → data/corpus.db (lokal)
 *   node scripts/segar-seq.mjs --turso         → Turso produksi (dewan-izhan-v3)
 *
 * Env (--turso): TURSO_API_TOKEN, TURSO_AUTH_TOKEN_NEW (atau .env.local)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const envLocal = (k) => {
  try { return readFileSync(".env.local", "utf8").match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim(); }
  catch { return undefined; }
};
const env = (k) => process.env[k] || envLocal(k);

const SQL = readFileSync("db/migrations/2026-10-23-bacaan-murah.sql", "utf8");
// Pecah ikut ';' di hujung baris — fail ini tiada ';' dalam rentetan.
const stmts = SQL.split(/;\s*\n/)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

const turso = process.argv.includes("--turso");
let run;
if (turso) {
  const org = env("TURSO_ORG") || "syaifulizhan-thgzut";
  const db = env("TURSO_DB") || "dewan-izhan-v3";
  const meta = await fetch(`https://api.turso.tech/v1/organizations/${org}/databases/${db}`, {
    headers: { Authorization: `Bearer ${env("TURSO_API_TOKEN")}` },
  }).then((r) => r.json());
  const url = `https://${meta.database.Hostname}/v2/pipeline`;
  run = async (sql) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("TURSO_AUTH_TOKEN_NEW")}`, "content-type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql } }, { type: "close" }] }),
    }).then((r) => r.json());
    const x = r.results[0];
    if (x.type !== "ok") throw new Error(x.error?.message ?? JSON.stringify(x));
    return { read: x.response.result.rows_read, written: x.response.result.rows_written };
  };
  console.log(`Sasaran: Turso ${db}\n`);
} else {
  const c = createClient({ url: "file:./data/corpus.db" });
  run = async (sql) => { await c.execute(sql); return { read: "-", written: "-" }; };
  console.log("Sasaran: data/corpus.db\n");
}

let R = 0, W = 0;
for (const sql of stmts) {
  const label = sql.split("\n")[0].slice(0, 70);
  try {
    const { read, written } = await run(sql);
    if (typeof read === "number") { R += read; W += written; }
    console.log(`  ✓ ${label.padEnd(72)} baca ${String(read).padStart(8)}  tulis ${String(written).padStart(8)}`);
  } catch (e) {
    // ALTER kali kedua: lajur sudah ada — itu yang dijangka, teruskan.
    if (/duplicate column/i.test(String(e.message))) { console.log(`  · ${label.padEnd(72)} (sudah ada)`); continue; }
    console.error(`  ✗ ${label}\n    ${e.message}`);
    process.exit(1);
  }
}
if (turso) console.log(`\nJumlah: baca ${R.toLocaleString()} · tulis ${W.toLocaleString()}`);
