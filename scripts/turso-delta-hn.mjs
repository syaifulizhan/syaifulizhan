// DELTA-SYNC hadith_narrators.narrator_id: UPDATE hanya baris yg BERUBAH (lokal vs live).
// JAUH lebih jimat writes dari full DROP+reinsert (~700k) — hanya bilangan baris berubah.
// Guna selepas penambahbaikan pemautan isnad. Melalui guard had peribadi.
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/turso-delta-hn.mjs [--write]
import { createClient } from "@libsql/client";
const WRITE = process.argv.includes("--write");
const local = createClient({ url: "file:./data/corpus.db" });
const remote = createClient({ url: process.env.TURSO_SYNC_URL, authToken: process.env.TURSO_SYNC_TOKEN });

async function loadMap(db) {
  const m = new Map(); let cur = -1;
  for (;;) {
    const r = await db.execute({ sql: "SELECT rowid rid, narrator_id nid FROM hadith_narrators WHERE rowid>? ORDER BY rowid LIMIT 10000", args: [cur] });
    if (!r.rows.length) break;
    for (const x of r.rows) { cur = Number(x.rid); m.set(cur, x.nid == null ? null : Number(x.nid)); }
  }
  return m;
}
console.log("→ Muat narrator_id lokal + live …");
const L = await loadMap(local), R = await loadMap(remote);
const diff = [];
for (const [rid, lv] of L) { if ((R.get(rid) ?? null) !== lv) diff.push([lv, rid]); }
console.log(`  baris BERBEZA (perlu UPDATE): ${diff.length} / ${L.size}`);
if (!diff.length) { console.log("  ✓ live sudah selari — 0 writes."); process.exit(0); }
if (!WRITE) { console.log("  (DRY — --write utk hantar delta)"); process.exit(0); }

// GUARD had peribadi (anggaran = bil diff)
import { readFileSync } from "node:fs";
const token = process.env.TURSO_API_TOKEN || (readFileSync(".env.local", "utf8").match(/^TURSO_API_TOKEN=(.+)$/m) || [])[1];
const SOFT = 9_500_000;
if (token) {
  const u = (await (await fetch("https://api.turso.tech/v1/organizations/syaifulizhan-thgzut/usage", { headers: { Authorization: `Bearer ${token}` } })).json())?.organization?.usage || {};
  const w = Number(u.rows_written || 0);
  console.log(`  usage ${w.toLocaleString()} + ~${diff.length} → ${(w + diff.length).toLocaleString()} / had ${SOFT.toLocaleString()}`);
  if (w + diff.length > SOFT) { console.error("  ⛔ lepas had peribadi — BATAL."); process.exit(1); }
}
console.log("→ Hantar UPDATE delta …");
for (let i = 0; i < diff.length; i += 500) {
  await remote.batch(diff.slice(i, i + 500).map(([nid, rid]) => ({ sql: "UPDATE hadith_narrators SET narrator_id=? WHERE rowid=?", args: [nid, rid] })), "write");
  process.stdout.write(`\r  ${Math.min(i + 500, diff.length)}/${diff.length}`);
}
console.log(`\n✓ Delta selesai: ${diff.length} baris dikemas (≈${diff.length} writes, bukan ~700k).`);
