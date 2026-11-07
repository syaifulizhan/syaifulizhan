// Penyaji kitab ringan untuk Worker (tanpa Next/React): kitab di luar belanjawan aset statik.
// SQL + pemasangan HTML dikongsi dengan penjana (kitab-data.mjs) -> keluaran sama bait demi bait.
// SATU pusingan pipeline Turso setiap halaman, semua query berjulat/berindeks (tiada imbasan, tiada count(*)).
import { renderKitab, kitabStmts, sharahStmt, sharahFromRow, shapeRows, bookOf, tocJson, kitabNoOf, BOOK_SQL, HAS_TOC_SQL, TOC_SQL, PER_PAGE } from "./kitab-data.mjs";
import { unavailable, HTML_HEADERS, type QueryFn } from "./paged-route";

/** Hanya integer positif tanpa sifar mendahului: id kitab ≤12 digit, nombor halaman ≤6 digit. Selainnya 404 tanpa DB. */
export const KITAB_PATH = /^\/kitab\/([1-9]\d{0,11})\/(?:([1-9]\d{0,5})\/|(toc\.json))?$/;

interface Opts { id: number; query: QueryFn; cssHrefs: string[]; notFound: () => Response }

/** /kitab/<id>/ dan /kitab/<id>/<n>/ — 1 pipeline: kitab, ada-toc, 6 query berjulat seq, syarah. */
export async function kitabResponse({ id, page, query, cssHrefs, notFound }: Opts & { page: number }): Promise<Response> {
  const lo = (page - 1) * PER_PAGE;
  const hi = page * PER_PAGE;
  const res = await query([
    { sql: BOOK_SQL, args: [id] },
    { sql: HAS_TOC_SQL, args: [id] },
    ...kitabStmts(id, lo, hi),
    sharahStmt(id, lo, hi),
  ]);
  if (!res) return unavailable();
  const bookRow = res[0][0];
  const total = Number(bookRow?.total_hadith ?? 0);
  if (!bookRow || total <= 0 || page > Math.max(1, Math.ceil(total / PER_PAGE))) return notFound();
  const [hadiths, isn, trs, ovr, bab, rul] = res.slice(2, 8);
  // Data tidak konsisten (cth seq belum disegarkan): jangan cache halaman salah/separa.
  if (hadiths.length !== Math.min(PER_PAGE, total - lo)) return unavailable();
  const html = renderKitab({
    book: bookOf(bookRow), total, page, hadiths, shaped: shapeRows({ isn, trs, ovr, bab, rul }),
    hasToc: res[1].length > 0, sharah: kitabNoOf(hadiths) ? sharahFromRow(res[8][0]) : null,
  }, cssHrefs);
  return new Response(html, { status: 200, headers: { ...HTML_HEADERS, "cache-control": "public, max-age=3600" } });
}

/** /kitab/<id>/toc.json — sama seperti fail statik: [ref, tajuk, n, halaman][]; 404 jika tiada bab. */
export async function tocResponse({ id, query, notFound }: Omit<Opts, "cssHrefs">): Promise<Response> {
  const res = await query([{ sql: BOOK_SQL, args: [id] }, { sql: TOC_SQL, args: [id] }]);
  if (!res) return unavailable();
  const total = Number(res[0][0]?.total_hadith ?? 0);
  if (total <= 0 || !res[1].length) return notFound();
  return new Response(tocJson(res[1], total), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
