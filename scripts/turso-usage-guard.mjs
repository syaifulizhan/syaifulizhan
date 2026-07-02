// GUARD had peribadi Turso: semak usage SEBELUM tulis. Enggan (exit 1) kalau
// rows_written semasa — ATAU + anggaran tulisan — akan lepas HAD PERIBADI (9.5M),
// supaya TAK PERNAH sentuh had sebenar 10M lagi. Baca sahaja (0 writes).
//   node scripts/turso-usage-guard.mjs          → lapor usage sahaja
//   node scripts/turso-usage-guard.mjs           (dipanggil turso-sync: baca /tmp/turso_diff.txt utk anggar)
// Env: TURSO_API_TOKEN (atau .env.local), TURSO_ORG (default syaifulizhan-thgzut),
//      SOFT_LIMIT (default 9_500_000).
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";

function envLocal(k) {
  try { const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${k}=(.+)$`, "m")); return m && m[1].trim(); }
  catch { return null; }
}
const TOKEN = process.env.TURSO_API_TOKEN || envLocal("TURSO_API_TOKEN");
const ORG = process.env.TURSO_ORG || "syaifulizhan-thgzut";
const HARD = 10_000_000;
const SOFT = Number(process.env.SOFT_LIMIT || envLocal("TURSO_SOFT_LIMIT") || 9_500_000);
if (!TOKEN) { console.error("✗ TURSO_API_TOKEN tiada"); process.exit(1); }

// Anggaran tulisan = jumlah baris LOKAL bagi jadual yg akan disync (dari /tmp/turso_diff.txt)
let est = 0;
const diffFile = process.env.DIFF_OUT || "/tmp/turso_diff.txt";
if (existsSync(diffFile)) {
  const tables = readFileSync(diffFile, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
  if (tables.length) {
    const local = createClient({ url: "file:./data/corpus.db" });
    for (const t of tables) {
      try { est += Number((await local.execute(`SELECT count(*) c FROM ${t}`)).rows[0].c); } catch {}
    }
    local.close();
  }
}

const r = await fetch(`https://api.turso.tech/v1/organizations/${ORG}/usage`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const u = (await r.json())?.organization?.usage || {};
const w = Number(u.rows_written || 0);
const pct = (w / HARD * 100).toFixed(1);
console.log(`  Turso rows_written: ${w.toLocaleString()} / ${HARD.toLocaleString()} (${pct}%) | had peribadi ${SOFT.toLocaleString()}`);
if (est) console.log(`  anggaran tulisan seterusnya: ~${est.toLocaleString()} → jumlah unjuran ${(w + est).toLocaleString()}`);

if (w >= SOFT) { console.error(`  ⛔ SUDAH lepas had peribadi (${SOFT.toLocaleString()}). TOLAK tulisan.`); process.exit(1); }
if (est && w + est > SOFT) { console.error(`  ⛔ tulisan ini akan LEPAS had peribadi. TOLAK. (baki selamat: ${(SOFT - w).toLocaleString()})`); process.exit(1); }
console.log(`  ✓ selamat di bawah had peribadi (baki ${(SOFT - w).toLocaleString()}).`);
process.exit(0);
