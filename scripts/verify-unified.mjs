// Sahkan DB Turso BERSATU lawan fail sumber tempatan — jalankan SELEPAS seed
// `turso db create --from-file`, SEBELUM tukar secret Cloudflare.
//
// Banding kiraan + cap-jari nilai (bukan sekadar kiraan) supaya kita tahu isi
// betul-betul sampai, bukan cuma jadual wujud.
//
//   TURSO_API_TOKEN=... node scripts/verify-unified.mjs <db-name> <fail-lokal.db>
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@libsql/client";

const [dbName, localFile] = process.argv.slice(2);
if (!dbName || !localFile) {
  console.error("guna: node scripts/verify-unified.mjs <db-name> <fail-lokal.db>");
  process.exit(1);
}

// Cap-jari: kiraan + jumlah panjang teks + jumlah kunci. Cukup untuk kesan
// baris hilang, teks terpotong, atau id tersasar — tanpa muat turun semula.
const CHECKS = [
  ["hadiths", "SELECT count(*) n, sum(length(coalesce(matn_ar,''))) len, sum(id) k FROM hadiths"],
  ["translations", "SELECT count(*) n, sum(length(coalesce(text,''))) len, sum(entity_id) k FROM translations"],
  ["books", "SELECT count(*) n, sum(length(coalesce(title_ar,''))) len, sum(id) k FROM books"],
  ["glossary", "SELECT count(*) n, sum(length(coalesce(term_ar,''))) len, 0 k FROM glossary"],
  ["hadith_bab", "SELECT count(*) n, sum(length(coalesce(bab_title,''))) len, sum(hadith_id) k FROM hadith_bab"],
  ["hadith_ruling", "SELECT count(*) n, sum(length(coalesce(hukm,''))) len, sum(hadith_id) k FROM hadith_ruling"],
  ["hadith_sanad_override", "SELECT count(*) n, sum(length(coalesce(nodes_json,''))) len, sum(hadith_id) k FROM hadith_sanad_override"],
  ["narrators", "SELECT count(*) n, sum(length(coalesce(name_ar,''))) len, sum(id) k FROM narrators"],
  ["hadith_narrators", "SELECT count(*) n, sum(coalesce(narrator_id,0)) len, count(narrator_id) k FROM hadith_narrators"],
  ["narrator_relations", "SELECT count(*) n, 0 len, 0 k FROM narrator_relations"],
  ["narrator_grades", "SELECT count(*) n, 0 len, 0 k FROM narrator_grades"],
  ["sharh_segment", "SELECT count(*) n, sum(length(coalesce(text,''))) len, sum(sharh_book_id) k FROM sharh_segment"],
  ["turath_page", "SELECT count(*) n, sum(length(coalesce(text,''))) len, sum(book_id) k FROM turath_page"],
  ["turath_heading", "SELECT count(*) n, 0 len, 0 k FROM turath_heading"],
  ["turath_book", "SELECT count(*) n, sum(length(coalesce(name,''))) len, sum(id) k FROM turath_book"],
];

const url = execFileSync("turso", ["db", "show", dbName, "--url"], { encoding: "utf8" }).trim();
const authToken = execFileSync("turso", ["db", "tokens", "create", dbName], { encoding: "utf8" }).trim();
const remote = createClient({ url, authToken });

const local = (sql) => {
  const out = execFileSync("sqlite3", [localFile, sql], { encoding: "utf8" }).trim();
  return out.split("|").map((v) => (v === "" ? "0" : v));
};

let bad = 0;
console.log(`\n  ${"jadual".padEnd(24)} ${"lokal".padEnd(34)} jauh`);
console.log("  " + "─".repeat(76));
for (const [name, sql] of CHECKS) {
  let r;
  try {
    r = (await remote.execute(sql)).rows[0];
  } catch (e) {
    console.log(`  ${name.padEnd(24)} ✗ JAUH GAGAL: ${e.message.slice(0, 40)}`);
    bad++;
    continue;
  }
  const [ln, ll, lk] = local(sql);
  const rn = String(r.n ?? 0), rl = String(r.len ?? 0), rk = String(r.k ?? 0);
  const ok = ln === rn && ll === rl && lk === rk;
  if (!ok) bad++;
  const fmt = (n, l, k) => `${Number(n).toLocaleString()} len=${l} k=${k}`;
  console.log(`  ${name.padEnd(24)} ${fmt(ln, ll, lk).padEnd(34)} ${fmt(rn, rl, rk)} ${ok ? "✓" : "✗ BEZA"}`);
}

console.log();
if (bad) {
  console.error(`  ✗ ${bad} jadual TAK PADAN — JANGAN tukar secret Cloudflare.`);
  process.exit(1);
}
console.log("  ✓ semua jadual padan — selamat tukar secret Cloudflare.");
process.exit(0);
