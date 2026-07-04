// Sync Musnad Ahmad al-Maknaz ke Turso: buang hn Ahmad-lama (hadith_id 9127–10500),
// masuk hn Ahmad-baharu (hadith_id≥60623) dlm SUSUNAN rowid lokal (kekal jajaran rowid
// supaya delta-hn masa depan selamat), + tepi narrator_relations yg tiada di remote.
// Berpengawal had peribadi 9.5M. Idempoten-ish (semak keadaan dulu).
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/sync-ahmad-turso.mjs [--write]
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
const WRITE = process.argv.includes("--write");
const local = createClient({ url: "file:./data/corpus.db" });
const remote = createClient({ url: process.env.TURSO_SYNC_URL, authToken: process.env.TURSO_SYNC_TOKEN });

const SOFT = 9_500_000;
const apiToken = process.env.TURSO_API_TOKEN || (readFileSync(".env.local", "utf8").match(/^TURSO_API_TOKEN=(.+)$/m) || [])[1];
const usage = async () => {
  const u = (await (await fetch("https://api.turso.tech/v1/organizations/syaifulizhan-thgzut/usage", { headers: { Authorization: `Bearer ${apiToken}` } })).json())?.organization?.usage || {};
  return Number(u.rows_written || 0);
};

// ── baca hn Ahmad-baharu lokal (ORDER BY rowid = susunan sisip) ──
const newHn = [];
let cur = -1;
for (;;) {
  const r = await local.execute({ sql: "SELECT rowid rid, hadith_id, narrator_id, chain_no, position, raw_name FROM hadith_narrators WHERE hadith_id>=60623 AND rowid>? ORDER BY rowid LIMIT 10000", args: [cur] });
  if (!r.rows.length) break;
  for (const x of r.rows) { cur = Number(x.rid); newHn.push([Number(x.hadith_id), x.narrator_id == null ? null : Number(x.narrator_id), Number(x.chain_no), Number(x.position), x.raw_name == null ? null : String(x.raw_name)]); }
}
// ── tepi lokal vs remote (delta) ──
const loadEdges = async (db) => {
  const s = new Set(); let off = 0;
  for (;;) {
    const r = await db.execute({ sql: "SELECT teacher_id t, student_id s FROM narrator_relations ORDER BY rowid LIMIT 10000 OFFSET ?", args: [off] });
    if (!r.rows.length) break;
    for (const x of r.rows) s.add(Number(x.t) + "|" + Number(x.s));
    off += r.rows.length; if (r.rows.length < 10000) break;
  }
  return s;
};
console.log("→ Muat tepi lokal + remote…");
const [L, R] = await Promise.all([loadEdges(local), loadEdges(remote)]);
const missingEdges = [...L].filter((k) => !R.has(k)).map((k) => k.split("|").map(Number));

const rDelOld = Number((await remote.execute("SELECT COUNT(*) n FROM hadith_narrators WHERE hadith_id BETWEEN 9127 AND 10500")).rows[0].n);
const rNew = Number((await remote.execute("SELECT COUNT(*) n FROM hadith_narrators WHERE hadith_id>=60623")).rows[0].n);
console.log(`\nRANCANGAN:`);
console.log(`  DELETE hn Ahmad-lama remote: ${rDelOld}`);
console.log(`  INSERT hn Ahmad-baharu: ${newHn.length} (remote kini ada ${rNew})`);
console.log(`  INSERT OR IGNORE tepi hilang: ${missingEdges.length}`);
const estWrites = rDelOld + newHn.length + missingEdges.length;
console.log(`  anggaran writes: ~${estWrites.toLocaleString()}`);

const w0 = await usage();
console.log(`  usage ${w0.toLocaleString()} → ~${(w0 + estWrites).toLocaleString()} / had ${SOFT.toLocaleString()}`);
if (w0 + estWrites > SOFT) { console.error("  ⛔ lepas had — BATAL."); process.exit(1); }
if (rNew > 0 && rNew !== newHn.length) console.warn(`  ⚠️ remote sudah ada ${rNew} hn id≥60623 — mungkin separa-sync; DELETE dulu utk bersih.`);

if (!WRITE) { console.log("\n(DRY — --write utk sync)"); process.exit(0); }

// bersih dulu kalau ada separa
if (rNew > 0) { console.log("→ Bersih hn id≥60623 sedia ada…"); await remote.execute("DELETE FROM hadith_narrators WHERE hadith_id>=60623"); }
console.log("→ DELETE hn Ahmad-lama…");
await remote.execute("DELETE FROM hadith_narrators WHERE hadith_id BETWEEN 9127 AND 10500");
console.log("→ INSERT hn Ahmad-baharu (susunan rowid)…");
for (let i = 0; i < newHn.length; i += 500) {
  await remote.batch(newHn.slice(i, i + 500).map((a) => ({ sql: "INSERT INTO hadith_narrators (hadith_id,narrator_id,chain_no,position,raw_name) VALUES (?,?,?,?,?)", args: a })), "write");
  process.stdout.write(`\r  ${Math.min(i + 500, newHn.length)}/${newHn.length}`);
}
console.log("\n→ INSERT tepi hilang…");
for (let i = 0; i < missingEdges.length; i += 500) {
  await remote.batch(missingEdges.slice(i, i + 500).map((e) => ({ sql: "INSERT OR IGNORE INTO narrator_relations (teacher_id,student_id) VALUES (?,?)", args: e })), "write");
}
// verifikasi kandungan
const rTot = Number((await remote.execute("SELECT COUNT(*) n FROM hadith_narrators")).rows[0].n);
const lTot = Number((await local.execute("SELECT COUNT(*) n FROM hadith_narrators")).rows[0].n);
const rRel = Number((await remote.execute("SELECT COUNT(*) n FROM narrator_relations")).rows[0].n);
const lRel = Number((await local.execute("SELECT COUNT(*) n FROM narrator_relations")).rows[0].n);
const w1 = await usage();
console.log(`\n✓ hadith_narrators: local ${lTot} == remote ${rTot} ? ${lTot === rTot ? "YA" : "TIDAK ⚠️"}`);
console.log(`✓ narrator_relations: local ${lRel} == remote ${rRel} ? ${lRel === rRel ? "YA" : "TIDAK ⚠️"}`);
console.log(`✓ writes terpakai: ~${(w1 - w0).toLocaleString()} · usage kini ${w1.toLocaleString()}`);
