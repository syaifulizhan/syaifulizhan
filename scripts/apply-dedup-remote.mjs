// Apply manifest dedup (scripts/_dedup-ops.json) ke Turso prod — statement demi
// statement dlm susunan asal (relasi dulu, kemudian per-loser: hn/grades/fts/delete).
// Selamat: guard had peribadi, gate pra-syarat, fail resume (elak double-apply FTS delete).
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/apply-dedup-remote.mjs [--write]
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const WRITE = process.argv.includes("--write");
const manifest = JSON.parse(readFileSync("scripts/_dedup-ops.json", "utf8"));
const { stmts } = manifest;
const STATE = "scripts/_dedup-remote-state.json";
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { when: manifest.when, done: 0 };
if (state.when !== manifest.when) { console.error("⛔ state file utk manifest lain — padam scripts/_dedup-remote-state.json jika sengaja"); process.exit(1); }

const remote = createClient({ url: process.env.TURSO_SYNC_URL, authToken: process.env.TURSO_SYNC_TOKEN });

// guard had peribadi
const SOFT = 9_500_000;
const apiToken = process.env.TURSO_API_TOKEN || (readFileSync(".env.local", "utf8").match(/^TURSO_API_TOKEN=(.+)$/m) || [])[1];
async function usage() {
  const u = (await (await fetch("https://api.turso.tech/v1/organizations/syaifulizhan-thgzut/usage", { headers: { Authorization: `Bearer ${apiToken}` } })).json())?.organization?.usage || {};
  return Number(u.rows_written || 0);
}
const w0 = await usage();
console.log(`usage semasa: ${w0.toLocaleString()} / had ${SOFT.toLocaleString()} · statement: ${stmts.length} (siap: ${state.done})`);
if (w0 + (stmts.length - state.done) * 1.5 > SOFT) { console.error("⛔ anggaran lepas had — BATAL."); process.exit(1); }

// gate pra-syarat: manifest belum diapply → narrators remote mesti > kiraan pasca-dedup
const rc = Number((await remote.execute("SELECT COUNT(*) n FROM narrators")).rows[0].n);
const nDeletes = stmts.filter((s) => s.sql.startsWith("DELETE FROM narrators")).length;
console.log(`narrators remote: ${rc.toLocaleString()} · DELETE dlm manifest: ${nDeletes}`);
if (state.done === 0 && rc < 127870) { console.error(`⛔ remote (${rc}) < pra-dedup 127,870 — keadaan tak dijangka, semak dulu.`); process.exit(1); }

if (!WRITE) { console.log("(DRY — --write utk apply)"); process.exit(0); }

const B = 300;
for (let i = state.done; i < stmts.length; i += B) {
  const batch = stmts.slice(i, Math.min(i + B, stmts.length));
  await remote.batch(batch.map((s) => ({ sql: s.sql, args: s.args })), "write");
  state.done = Math.min(i + B, stmts.length);
  writeFileSync(STATE, JSON.stringify(state));
  process.stdout.write(`\r  ${state.done}/${stmts.length}`);
  if ((i / B) % 20 === 19) {
    const w = await usage();
    if (w > SOFT) { console.error(`\n⛔ usage ${w.toLocaleString()} lepas had — BERHENTI (resume selamat).`); process.exit(1); }
  }
}
console.log("\n✓ Manifest diapply sepenuhnya.");
const rc2 = Number((await remote.execute("SELECT COUNT(*) n FROM narrators")).rows[0].n);
const w1 = await usage();
console.log(`narrators remote kini: ${rc2.toLocaleString()} (jangka ${(127870 - nDeletes).toLocaleString()}) · writes terpakai: ~${(w1 - w0).toLocaleString()}`);
