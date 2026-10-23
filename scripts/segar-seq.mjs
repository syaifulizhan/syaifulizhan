#!/usr/bin/env node
/**
 * Jalankan db/migrations/2026-10-23-bacaan-murah.sql — idempoten.
 *
 * Memasang/menyegarkan `hadiths.seq`, `books.total_hadith`, `book_chapter` dan
 * indeks. Hadis tanpa seq TIDAK muncul di muka kitab, jadi ini mesti berjalan
 * selepas setiap import hadis. Ia berjalan SENDIRI — tiada siapa perlu ingat:
 *   · skrip import/sync (import-musnad-ahmad, build-sqlite, turso-load,
 *     sync-ahmad-turso) memanggilnya di hujung;
 *   · .github/workflows/kuota.yml memanggil `--turso --jika-perlu` setiap 3 jam
 *     sebagai jaring keselamatan (cth seed semula `turso db create --from-file`).
 *
 * Melaporkan rows_read / rows_written SEBENAR setiap pernyataan (dari respons
 * Hrana Turso), supaya kos sentiasa diukur, bukan diteka.
 *
 *   node scripts/segar-seq.mjs                         → data/corpus.db (lokal)
 *   node scripts/segar-seq.mjs --turso                 → Turso produksi
 *   node scripts/segar-seq.mjs --turso --jika-perlu    → semak dahulu (~5 bacaan);
 *                                                        segar hanya jika lapuk
 *
 * Env (--turso): TURSO_API_TOKEN (wajib); TURSO_AUTH_TOKEN_NEW (pilihan — jika
 * tiada, token DB 1-jam dijana melalui API, jadi CI tidak perlu rahsia tambahan).
 */
import { readFileSync } from "node:fs";

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
const jikaPerlu = process.argv.includes("--jika-perlu");

let run; // (sql) → { rows, read, written }
if (turso) {
  const org = env("TURSO_ORG") || "syaifulizhan-thgzut";
  const db = env("TURSO_DB") || "dewan-izhan-v3";
  const api = async (path, init) => {
    const r = await fetch(`https://api.turso.tech/v1/organizations/${org}/databases/${db}${path}`, {
      ...init, headers: { Authorization: `Bearer ${env("TURSO_API_TOKEN")}` },
    });
    if (!r.ok) throw new Error(`API ${path} → HTTP ${r.status}`);
    return r.json();
  };
  const host = (await api("")).database.Hostname;
  const token = env("TURSO_AUTH_TOKEN_NEW")
    || (await api("/auth/tokens?expiration=1h&authorization=full-access", { method: "POST" })).jwt;
  run = async (sql) => {
    const r = await fetch(`https://${host}/v2/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql } }, { type: "close" }] }),
    }).then((r) => r.json());
    const x = r.results[0];
    if (x.type !== "ok") throw new Error(x.error?.message ?? JSON.stringify(x));
    const res = x.response.result;
    return { rows: res.rows.map((row) => row.map((c) => c.value)), read: res.rows_read, written: res.rows_written };
  };
  console.log(`Sasaran: Turso ${db}\n`);
} else {
  const { createClient } = await import("@libsql/client");
  const c = createClient({ url: "file:./data/corpus.db" });
  run = async (sql) => {
    const r = await c.execute(sql);
    return { rows: r.rows.map((row) => Object.values(row)), read: "-", written: "-" };
  };
  console.log("Sasaran: data/corpus.db\n");
}

/*
 * Semakan murah — adakah seq/total_hadith/book_chapter lapuk? (~5 bacaan; semakan
 * `seq IS NULL` ke atas semua baris akan membaca 85k, jadi JANGAN.)
 *   · hadis terbaharu (id terbesar) tiada seq     → ada import baharu
 *   · count(hadiths) ≠ sum(books.total_hadith)    → baris ditambah/dibuang
 *   · book_chapter tiada / kosong                 → seed semula tanpa jadual ini
 */
async function lapuk() {
  try {
    const q = async (sql) => (await run(sql)).rows[0]?.[0];
    const seqTerbaru = await q("SELECT seq FROM hadiths WHERE id = (SELECT max(id) FROM hadiths)");
    if (seqTerbaru == null) return "hadis terbaharu tiada seq";
    const [n, jumlah] = [Number(await q("SELECT count(*) FROM hadiths")), Number(await q("SELECT sum(total_hadith) FROM books"))];
    if (n !== jumlah) return `count(hadiths)=${n} ≠ sum(total_hadith)=${jumlah}`;
    if (!(await q("SELECT 1 FROM book_chapter LIMIT 1"))) return "book_chapter kosong";
    return null;
  } catch (e) {
    return `skema belum lengkap (${e.message.slice(0, 80)})`;
  }
}

if (jikaPerlu) {
  const sebab = await lapuk();
  if (!sebab) { console.log("✓ seq/total_hadith/book_chapter terkini — tiada apa perlu disegar."); process.exit(0); }
  console.log(`! Lapuk: ${sebab} — menyegar …\n`);
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

const baki = await lapuk();
if (baki) { console.error(`\n✗ Masih lapuk selepas segar: ${baki}`); process.exit(1); }
console.log("✓ Disahkan terkini.");
