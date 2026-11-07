#!/usr/bin/env node
// Penjana HTML statik halaman utama — dijalankan SELEPAS gen-perawi-static (perlukan css-hrefs.json / .next CSS).
//
//   .open-next/assets/index.html            laman utama
//   .open-next/assets/hadis/index.html      senarai kitab (60) + jumlah hadis
//   .open-next/assets/perawi/index.html     indeks perawi
//   .open-next/assets/glosari/index.html    glosari penuh (penapis dalam pelayar)
//   .open-next/assets/cari/index.html       cangkerang carian (hasil: Worker /x/cari/)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  homePage, hadisIndexPage, perawiIndexPage, glosariPage, cariShellPage,
  HADIS_SQL, HADIS_BOOKS, PERAWI_INDEX_SQL, PERAWI_INDEX_N, GLOSARI_SQL,
} from "../src/static/pages.mjs";
import { ASSETS, rows, cssHrefs, writeCssManifest } from "./lib/static-common.mjs";

const CSS = cssHrefs();
writeCssManifest(CSS);

const write = (rel, html) => {
  const f = join(ASSETS, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, html);
  console.log(`${rel.padEnd(22)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
};
const plain = (list) => list.map((r) => ({ ...r }));

const [books, hadisTotal, narrators, narratorTotal, terms] = await Promise.all([
  rows(HADIS_SQL.books, [HADIS_BOOKS]),
  rows(HADIS_SQL.total),
  rows(PERAWI_INDEX_SQL.first, [PERAWI_INDEX_N]),
  rows(PERAWI_INDEX_SQL.total),
  rows(GLOSARI_SQL),
]);
const total = Number(hadisTotal[0].c);
const ntotal = Number(narratorTotal[0].c);
if (books.length < HADIS_BOOKS || total < 1000 || narrators.length < PERAWI_INDEX_N || ntotal < 1000 || terms.length < 100) {
  throw new Error(`data tidak lengkap: books=${books.length} hadis=${total} perawi=${narrators.length}/${ntotal} glosari=${terms.length}`);
}

write("index.html", homePage(CSS));
write("hadis/index.html", hadisIndexPage({ books: plain(books), total }, CSS));
write("perawi/index.html", perawiIndexPage({ rows: plain(narrators), total: ntotal }, CSS));
write("glosari/index.html", glosariPage({ terms: plain(terms) }, CSS));
write("cari/index.html", cariShellPage(CSS));
