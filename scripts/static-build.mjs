#!/usr/bin/env node
// Jana aset statik (kitab/, perawi/, hadis/, glosari/, cari/, index.html) HANYA bila data/penjana berubah.
// Selainnya: pulihkan daripada STATIC_CACHE_DIR (CI: actions/cache berkunci cap jari) → hampir 0 baca Turso.
//   STATIC_FP         cap jari dikira awal oleh CI (kunci cache); kalau tiada, dikira di sini.
//   STATIC_CACHE_DIR  folder cache (tiada = sentiasa jana, tanpa cache).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fingerprint } from "./static-fingerprint.mjs";
import { ASSETS, cssHrefs, writeCssManifest } from "./lib/static-common.mjs";

// Keluaran penjana (relatif ASSETS). css-hrefs.json & static-site.css dijana semula setiap kali (tanpa DB), bukan dalam cache.
const OUTPUTS = ["kitab", "perawi", "hadis", "glosari", "cari", "index.html"];
const GENERATORS = ["gen-kitab-static.mjs", "gen-perawi-static.mjs", "gen-pages-static.mjs"];
const full = !process.env.STATIC_BOOK_LIMIT && !process.env.STATIC_PERAWI_LIMIT;

writeCssManifest(cssHrefs());
const fp = process.env.STATIC_FP || (await fingerprint()).fp;
const cache = process.env.STATIC_CACHE_DIR;
const marker = cache && join(cache, "fp.txt");
const count = (d) => (existsSync(d) ? readdirSync(d).length : 0);

if (cache && full && existsSync(marker) && readFileSync(marker, "utf8").trim() === fp && OUTPUTS.every((o) => existsSync(join(cache, o)))) {
  for (const o of OUTPUTS) cpSync(join(cache, o), join(ASSETS, o), { recursive: true });
  // jaminan keras: cache rosak/separa → gagal, jangan deploy laman kosong
  if (count(join(ASSETS, "kitab")) < 900 || count(join(ASSETS, "perawi")) < 9000) throw new Error("cache statik tidak lengkap — padam cache dan bina semula");
  console.log(`static cache: HIT (fingerprint ${fp})`);
} else {
  console.log(`static cache: MISS (fingerprint ${fp})`);
  for (const g of GENERATORS) {
    const r = spawnSync(process.execPath, [join("scripts", g)], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  if (cache && full) {
    rmSync(cache, { recursive: true, force: true });
    mkdirSync(cache, { recursive: true });
    for (const o of OUTPUTS) cpSync(join(ASSETS, o), join(cache, o), { recursive: true });
    writeFileSync(marker, `${fp}\n`); // penanda terakhir: cache separa tidak pernah dianggap sah
  }
}
