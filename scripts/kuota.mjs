#!/usr/bin/env node
/**
 * Pantau kuota Turso — ukur, bukan teka.
 *
 * KENAPA WUJUD: pada 10 Sep 2026 akaun Turso disekat sepenuhnya kerana bacaan
 * mencecah 627,991,252 daripada had 500,000,000 (126%). Tiada siapa perasan
 * sehingga emel sekatan tiba. Pada pelan percuma, mencecah MANA-MANA had akan
 * menyekat SELURUH akaun — bukan memperlahankannya.
 *
 * Skrip ini merekod bacaan harian supaya trend kelihatan, dan menjerit pada 70%
 * (bukan 100%, kerana pada 100% sudah terlambat).
 *
 * Env: TURSO_API_TOKEN
 * Guna: node scripts/kuota.mjs [--csv docs/kuota-log.csv]
 */

const TOKEN = process.env.TURSO_API_TOKEN;
if (!TOKEN) { console.error("RALAT: TURSO_API_TOKEN tiada."); process.exit(2); }

const AMARAN = 70;   // % — mula bimbang
const KRITIKAL = 90; // % — larian jadi merah

const api = async (path) => {
  const r = await fetch(`https://api.turso.tech/v1${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
};

const orgs = await api("/organizations");
const org = (Array.isArray(orgs) ? orgs : orgs.organizations)[0];
const slug = org.slug;

const [{ total: guna }, { plans }, { subscription: sub }] = await Promise.all([
  api(`/organizations/${slug}/usage`),
  api(`/organizations/${slug}/plans`),
  api(`/organizations/${slug}/subscription`),
]);

const kuota = plans.find((p) => p.name === sub.plan)?.quotas ?? {};
const ukur = [
  ["rows_read", "Baris dibaca", guna.rows_read ?? 0, kuota.rowsRead],
  ["rows_written", "Baris ditulis", guna.rows_written ?? 0, kuota.rowsWritten],
  ["storage", "Storan", guna.storage_bytes ?? 0, kuota.storage],
];

// Berapa hari lagi dalam kitaran bil — untuk unjuran.
const tamat = new Date(sub.current_billing_period_end);
const mula = new Date(sub.current_billing_period_start);
const kini = new Date();
const harilalu = Math.max((kini - mula) / 86400000, 0.5);
const harijumlah = (tamat - mula) / 86400000;

console.log(`Turso · org ${slug} · pelan ${sub.plan} · kitaran berakhir ${sub.current_billing_period_end.slice(0, 10)}\n`);

let tertinggi = 0;
const baris = [];
for (const [kunci, label, nilai, had] of ukur) {
  if (!had) continue;
  const pct = (nilai / had) * 100;
  tertinggi = Math.max(tertinggi, pct);
  // Unjuran linear: pada kadar ini, berapa % menjelang akhir kitaran?
  const unjur = (nilai / harilalu) * harijumlah / had * 100;
  const tanda = pct >= KRITIKAL ? "✗" : pct >= AMARAN ? "!" : "✓";
  console.log(
    `  ${tanda} ${label.padEnd(14)} ${nilai.toLocaleString().padStart(15)} / ${had.toLocaleString().padStart(15)}` +
    `  ${pct.toFixed(1).padStart(6)}%   unjuran akhir kitaran: ${unjur.toFixed(0)}%`
  );
  baris.push({ kunci, nilai, had, pct, unjur });
}

// Log CSV — satu baris sehari, supaya trend boleh dilihat merentas bulan.
const iCsv = process.argv.indexOf("--csv");
if (iCsv > -1 && process.argv[iCsv + 1]) {
  const { appendFileSync, existsSync, writeFileSync } = await import("node:fs");
  const fail = process.argv[iCsv + 1];
  if (!existsSync(fail)) writeFileSync(fail, "tarikh,rows_read,rows_written,storage_bytes,pct_tertinggi\n");
  const r = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  appendFileSync(fail, `${kini.toISOString().slice(0, 10)},${r.rows_read ?? 0},${r.rows_written ?? 0},${r.storage ?? 0},${tertinggi.toFixed(1)}\n`);
  console.log(`\n  dicatat → ${fail}`);
}

if (tertinggi >= KRITIKAL) {
  console.error(`\nKRITIKAL: ${tertinggi.toFixed(0)}% kuota diguna. Pada pelan percuma, mencecah had menyekat SELURUH akaun.`);
  process.exit(1);
}
if (tertinggi >= AMARAN) console.warn(`\nAMARAN: ${tertinggi.toFixed(0)}% kuota diguna.`);
else console.log(`\nSemua dalam had (tertinggi ${tertinggi.toFixed(1)}%).`);
