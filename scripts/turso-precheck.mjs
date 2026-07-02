// Preflight sync Turso: banding kiraan baris LOKAL (corpus.db) vs REMOTE (Turso).
// Tujuan: ELAK rewrite penuh (DROP+reinsert ~1.4M baris) bila data sebenarnya
// sudah selari — punca had writes 10M tercapai dulu (rewrite berulang).
//   exit 0 = SELARI (tiada perlu tulis)   exit 1 = BEZA (perlu sync)
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/turso-precheck.mjs
import { createClient } from "@libsql/client";
import { writeFileSync } from "node:fs";

// Skop Turso = PERAWI/ISNAD SAHAJA (lihat src/lib/narrators.ts + getIsnadFor).
// books/hadiths/translations/glossary = Cloudflare D1; auth/moderasi = Supabase.
// JANGAN sync benda D1/Supabase ke Turso — itu punca over-write dulu.
const TABLES = ["narrators", "narrator_grades", "narrator_relations", "hadith_narrators"];
const DIFF_OUT = process.env.DIFF_OUT || "/tmp/turso_diff.txt";

const local = createClient({ url: "file:./data/corpus.db" });
const remote = createClient({ url: process.env.TURSO_SYNC_URL, authToken: process.env.TURSO_SYNC_TOKEN });

async function counts(db) {
  const o = {};
  for (const t of TABLES) {
    try { o[t] = Number((await db.execute(`SELECT count(*) n FROM ${t}`)).rows[0].n); }
    catch { o[t] = -1; } // jadual tiada di hujung itu
  }
  return o;
}

const L = await counts(local);
const R = await counts(remote);
const diffTables = [];
console.log("  jadual                  lokal      remote");
for (const t of TABLES) {
  const mark = L[t] !== R[t] ? "  ≠ BEZA" : "";
  if (L[t] !== R[t]) diffTables.push(t);
  console.log(`  ${t.padEnd(22)} ${String(L[t]).padStart(8)} ${String(R[t]).padStart(11)}${mark}`);
}
local.close(); remote.close();
writeFileSync(DIFF_OUT, diffTables.join("\n"));  // sync baca ini → tulis jadual beza SAHAJA
if (diffTables.length) {
  const writes = diffTables.reduce((s, t) => s + Math.max(0, L[t]), 0);
  console.log(`\n  → ${diffTables.length} jadual beza: ${diffTables.join(", ")}`);
  console.log(`  → anggaran writes utk pulih: ~${writes.toLocaleString()} baris`);
}
process.exit(diffTables.length ? 1 : 0);
