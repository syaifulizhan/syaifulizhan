// Belanjawan aset statik kitab — SATU tempat. Aset Workers percuma ≤ 20,000 fail (check-asset-count.mjs gagalkan > 19,000).
// Kitab yang tidak muat dihidang oleh Worker (src/static/kitab-route.ts) dengan templat sama; tiada kehilangan kandungan.
//   STATIC_ASSET_BUDGET   jumlah fail sasaran (lalai 18,500; pengawal akhir 19,000)
//   STATIC_PERAWI_RESERVE fail dikhaskan untuk perawi/ + senarai.json (lalai 11,500 = 10,000 halaman + ~1,200 senarai + margin)
import { normalizeArabic } from "../../src/lib/arabic.ts";
import { PER_PAGE } from "../../src/static/templates.mjs";

export const ASSET_BUDGET = Number(process.env.STATIC_ASSET_BUDGET) || 18500;
export const PERAWI_RESERVE = Number(process.env.STATIC_PERAWI_RESERVE) || 11500;
export const OTHER_RESERVE = 500; // _next/static (~30–100), /, /hadis/, /perawi/, /glosari/, /cari/, 404, skrip

const SAHIHAYN = new Set([900003, 900007]);

/** 0 = Sahihayn, 1 = Sunan (tajuk bermula "سنن"), 2 = lain-lain. */
export const priorityOf = (b) => (SAHIHAYN.has(Number(b.id)) ? 0 : normalizeArabic(b.title_ar).startsWith("سنن") ? 1 : 2);
/** Fail aset sebuah kitab: halaman + toc.json (anggaran konservatif: sentiasa ada toc). */
export const costOf = (n) => Math.max(1, Math.ceil(n / PER_PAGE)) + 1;

/**
 * Belanjawan kitab TETAP (tidak bergantung pada bilangan fail semasa dalam assets/) supaya output kitab hanya
 * bergantung pada data kitab + kod kitab (cap jari cache per penjana). check-asset-count.mjs ialah pengawal akhir.
 */
export const kitabBudget = () => Math.max(0, ASSET_BUDGET - PERAWI_RESERVE - OTHER_RESERVE);

/**
 * Pilih kitab untuk dipra-jana: keutamaan (Sahihayn, Sunan, lain-lain) kemudian bilangan hadis menurun.
 * Seluruh kitab atau tiada (tiada separuh-statik); yang tidak muat dilangkau, kitab lebih kecil masih dicuba.
 * Pulangan: { chosen:Set<id>, left:[{id,title,n,cost}], used, budget }.
 */
export function planKitab(books, budget) {
  const ranked = books.filter((b) => b.n > 0).sort((a, b) => priorityOf(a) - priorityOf(b) || b.n - a.n || a.id - b.id);
  const chosen = new Set();
  const left = [];
  let used = 0;
  for (const b of ranked) {
    const cost = costOf(b.n);
    if (used + cost <= budget) { chosen.add(b.id); used += cost; }
    else left.push({ id: b.id, title: b.title_ar, n: b.n, cost });
  }
  return { chosen, left, used, budget };
}
