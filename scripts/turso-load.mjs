// Muat dump SQL besar ke Turso secara BERKELOMPOK (batch libsql HTTP) — gantian
// `turso db shell < fail` yang putus stream pada muatan besar (>100MB).
//   TURSO_SYNC_URL=libsql://… TURSO_SYNC_TOKEN=… node scripts/turso-load.mjs /tmp/turso_sync.sql
import { createClient } from "@libsql/client";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const FILE = process.argv[2] ?? "/tmp/turso_sync.sql";
const url = process.env.TURSO_SYNC_URL;
const authToken = process.env.TURSO_SYNC_TOKEN;
if (!url || !authToken) { console.error("✗ TURSO_SYNC_URL / TURSO_SYNC_TOKEN tiada"); process.exit(1); }

const db = createClient({ url, authToken });
const BATCH = 500;

let stmt = "";
let batch = [];
let n = 0, flushed = 0;
const t0 = Date.now();

async function flush() {
  if (!batch.length) return;
  const cur = batch; batch = [];
  for (let attempt = 0; ; attempt++) {
    try { await db.batch(cur, "write"); break; }
    catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  flushed += cur.length;
  process.stdout.write(`\r  dimuat ${flushed} pernyataan (${((Date.now() - t0) / 1000).toFixed(0)}s)   `);
}

// Pernyataan tamat bila berakhir ";" DAN bilangan ' seimbang (genap) — kerana
// nilai string (matn) boleh mengandungi newline; '' = escape dlm SQLite (genap).
const balanced = (s) => ((s.match(/'/g) || []).length % 2 === 0);
const rl = createInterface({ input: createReadStream(FILE), crlfDelay: Infinity });
for await (const line of rl) {
  if (!stmt && !line.trim()) continue; // langkau baris kosong ANTARA pernyataan sahaja
  stmt += (stmt ? "\n" : "") + line;
  if (line.trimEnd().endsWith(";") && balanced(stmt)) {
    const s = stmt.trim(); stmt = "";
    // Langkau pembungkus transaksi iterdump (db.batch sudah ada txn sendiri) + PRAGMA.
    if (/^(BEGIN|COMMIT|END)\b/i.test(s) || s === "PRAGMA foreign_keys=OFF;") continue;
    // DDL (DROP/CREATE/FTS rebuild) jalan sendiri-sendiri utk elak konflik txn.
    if (/^(DROP|CREATE|INSERT INTO \w+_fts)/i.test(s)) {
      await flush();
      try { await db.execute(s); } catch (e) { console.error(`\n  ⚠ DDL: ${e.message}\n     ${s.slice(0, 80)}`); }
    } else {
      batch.push(s);
      n++;
      if (batch.length >= BATCH) await flush();
    }
  }
}
await flush();
console.log(`\n✓ Siap: ${n} INSERT dimuat (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
const c = async (t) => (await db.execute(`SELECT count(*) n FROM ${t}`)).rows[0].n;
console.log(`  narrators=${await c("narrators")} hadiths=${await c("hadiths")} relations=${await c("narrator_relations")} translations=${await c("translations")}`);
db.close();
