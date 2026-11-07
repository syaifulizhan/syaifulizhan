#!/usr/bin/env node
// Cap jari data+penjana untuk cache aset statik. MURAH: ~13 baca baris (SELECT max(rowid) per jadual;
// TIADA count(*)/imbasan — Turso mengenakan bayaran per baris diimbas).
//   fp = sha256( max(rowid) tiap jadual sumber + hash fail penjana/templat + STATIC_DATA_VERSION )
// Suntingan DALAM-TEMPAT (baris sedia ada diubah) tidak menukar max(rowid): naikkan scripts/static-data-version.txt.
// book_chapter (WITHOUT ROWID) diterbitkan daripada hadiths/books, jadi dilindungi oleh max(rowid) itu.
import { createHash } from "node:crypto";
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Satu cap jari PER penjana (kitab / perawi / pages): suntingan templat laman utama tidak menjana semula kitab/perawi
 * daripada Turso. Setiap bahagian = jadual yang dibacanya + fail penjana itu + fail kongsi.
 * Jadual: semak dengan grep FROM/JOIN pada penjana dan src/static/*.mjs. book_chapter (WITHOUT ROWID) diterbitkan
 * daripada hadiths/books, jadi dilindungi oleh max(rowid) itu.
 */
const SHARED_FILES = [
  "scripts/lib/static-common.mjs", "src/static/templates.mjs", "src/lib/arabic.ts", "src/lib/i18n.ts", "src/lib/parse-isnad.ts",
  "scripts/static-data-version.txt",
];
export const PARTS = {
  kitab: {
    outputs: ["kitab"],
    tables: ["hadiths", "hadith_narrators", "hadith_ruling", "hadith_bab", "hadith_sanad_override", "translations", "narrators", "books", "turath_book", "sharh_segment"],
    files: ["scripts/gen-kitab-static.mjs", "src/static/kitab-data.mjs", "scripts/lib/static-budget.mjs"],
  },
  perawi: {
    outputs: ["perawi"],
    tables: ["hadith_narrators", "narrators", "narrator_grades", "narrator_relations"],
    files: ["scripts/gen-perawi-static.mjs"],
  },
  pages: {
    outputs: ["hadis", "glosari", "cari", "index.html"],
    tables: ["books", "hadiths", "narrators", "glossary"],
    files: ["scripts/gen-pages-static.mjs", "src/static/pages.mjs"],
  },
};
export const GENERATOR = { kitab: "gen-kitab-static.mjs", perawi: "gen-perawi-static.mjs", pages: "gen-pages-static.mjs" };

/** Hash fail bagi satu bahagian (urutan tetap). */
export function sourceHash(part) {
  const h = createHash("sha256");
  for (const f of [...SHARED_FILES, ...PARTS[part].files].sort()) h.update(`${f}\0`).update(readFileSync(join(ROOT, f))).update("\0");
  return h.digest("hex");
}

/** Cap jari semua bahagian. Jadual dibaca sekali sahaja (max(rowid), tiada count(*)). Suntingan dalam-tempat: naikkan static-data-version.txt. */
export async function fingerprints() {
  const { rowsSafe } = await import("./lib/static-common.mjs");
  const max = {};
  for (const t of new Set(Object.values(PARTS).flatMap((p) => p.tables))) {
    const r = await rowsSafe(`SELECT max(rowid) m FROM ${t}`);
    max[t] = `${t}=${r[0]?.m ?? "none"}`;
  }
  const out = {};
  for (const [name, p] of Object.entries(PARTS)) {
    const stamp = p.tables.map((t) => max[t]).join(",");
    const src = sourceHash(name);
    out[name] = { fp: createHash("sha256").update(name).update("\0").update(stamp).update("\0").update(src).digest("hex").slice(0, 32), stamp, src };
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fps = await fingerprints();
  for (const [name, { fp, stamp, src }] of Object.entries(fps)) {
    console.log(`fingerprint ${name} ${fp}\n  data: ${stamp}\n  source: ${src.slice(0, 12)}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `fp_${name}=${fp}\n`);
  }
  process.exit(0);
}
