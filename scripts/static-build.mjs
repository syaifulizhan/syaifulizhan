#!/usr/bin/env node
// Jana aset statik (kitab/, perawi/, hadis/, glosari/, cari/, index.html) HANYA bila data/penjana berubah — PER PENJANA.
// Tiga bahagian (kitab, perawi, pages) masing-masing ada cap jari (scripts/static-fingerprint.mjs) dan subfolder cache sendiri;
// suntingan hanya pages.mjs tidak menjana semula kitab/perawi daripada Turso.
//   STATIC_FP_KITAB|PERAWI|PAGES  cap jari dikira awal oleh CI (kunci cache); kalau tiada, dikira di sini.
//   STATIC_CACHE_DIR              folder cache (<dir>/<bahagian>/{fp.txt,<output>}; tiada = sentiasa jana, tanpa cache).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fingerprints, PARTS, GENERATOR } from "./static-fingerprint.mjs";
import { ASSETS, cssHrefs, writeCssManifest } from "./lib/static-common.mjs";

const full = !process.env.STATIC_BOOK_LIMIT && !process.env.STATIC_PERAWI_LIMIT;
// Pengawal keras selepas pulih cache: cache rosak/separa → gagal, jangan deploy laman kosong.
const MIN = { kitab: ["kitab", 900], perawi: ["perawi", 9000] };
const count = (d) => (existsSync(d) ? readdirSync(d).length : 0);

writeCssManifest(cssHrefs()); // css-hrefs.json & static-site.css dijana semula setiap kali (tanpa DB), bukan dalam cache
const env = (name) => process.env[`STATIC_FP_${name.toUpperCase()}`];
const needDb = Object.keys(PARTS).some((n) => !env(n));
const computed = needDb ? await fingerprints() : {};
const cache = process.env.STATIC_CACHE_DIR;

for (const [name, part] of Object.entries(PARTS)) {
  const fp = env(name) || computed[name].fp;
  const dir = cache && join(cache, name);
  const marker = dir && join(dir, "fp.txt");
  if (dir && full && existsSync(marker) && readFileSync(marker, "utf8").trim() === fp && part.outputs.every((o) => existsSync(join(dir, o)))) {
    for (const o of part.outputs) cpSync(join(dir, o), join(ASSETS, o), { recursive: true });
    const [sub, min] = MIN[name] ?? [];
    if (sub && count(join(ASSETS, sub)) < min) throw new Error(`cache statik ${name} tidak lengkap — padam cache dan bina semula`);
    console.log(`static cache ${name}: HIT (fingerprint ${fp})`);
    continue;
  }
  console.log(`static cache ${name}: MISS (fingerprint ${fp})`);
  const r = spawnSync(process.execPath, [join("scripts", GENERATOR[name])], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  if (dir && full) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const o of part.outputs) cpSync(join(ASSETS, o), join(dir, o), { recursive: true });
    writeFileSync(marker, `${fp}\n`); // penanda terakhir: cache separa tidak pernah dianggap sah
  }
}
