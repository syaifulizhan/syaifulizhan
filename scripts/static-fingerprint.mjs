#!/usr/bin/env node
// Cap jari data+penjana untuk cache aset statik. MURAH: ~13 baca baris (SELECT max(rowid) per jadual;
// TIADA count(*)/imbasan — Turso mengenakan bayaran per baris diimbas).
//   fp = sha256( max(rowid) tiap jadual sumber + hash fail penjana/templat + STATIC_DATA_VERSION )
// Suntingan DALAM-TEMPAT (baris sedia ada diubah) tidak menukar max(rowid): naikkan scripts/static-data-version.txt.
// book_chapter (WITHOUT ROWID) diterbitkan daripada hadiths/books, jadi dilindungi oleh max(rowid) itu.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Jadual yang dibaca oleh gen-kitab/perawi/pages-static + src/static/*.mjs (semak: grep FROM/JOIN). */
export const SOURCE_TABLES = [
  "hadiths", "hadith_narrators", "hadith_ruling", "hadith_bab", "hadith_sanad_override", "translations",
  "narrators", "narrator_grades", "narrator_relations", "books", "glossary", "turath_book", "sharh_segment",
];

const listFiles = (dir, test) => readdirSync(join(ROOT, dir), { withFileTypes: true })
  .filter((e) => e.isFile() && test(e.name)).map((e) => `${dir}/${e.name}`);

/** Fail yang mengubah output HTML/JSON statik jika disentuh. */
export const sourceFiles = () => [
  ...listFiles("scripts", (n) => /^(gen-.*-static|static-build|static-fingerprint)\.mjs$/.test(n)),
  ...listFiles("scripts/lib", () => true),
  ...listFiles("src/static", (n) => n.endsWith(".mjs")),
  "src/lib/arabic.ts", "scripts/static-data-version.txt",
].sort();

export function sourceHash() {
  const h = createHash("sha256");
  for (const f of sourceFiles()) h.update(`${f}\0`).update(readFileSync(join(ROOT, f))).update("\0");
  return h.digest("hex");
}

export async function fingerprint() {
  const { rowsSafe } = await import("./lib/static-common.mjs");
  const parts = [];
  for (const t of SOURCE_TABLES) {
    const r = await rowsSafe(`SELECT max(rowid) m FROM ${t}`);
    parts.push(`${t}=${r[0]?.m ?? "none"}`);
  }
  const stamp = parts.join(",");
  const src = sourceHash();
  const fp = createHash("sha256").update(stamp).update("\0").update(src).digest("hex").slice(0, 32);
  return { fp, stamp, src };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { fp, stamp, src } = await fingerprint();
  console.log(`fingerprint ${fp}\n  data: ${stamp}\n  source: ${src.slice(0, 12)}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `fp=${fp}\n`);
  process.exit(0);
}
