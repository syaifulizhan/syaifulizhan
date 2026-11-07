// Satu tempat untuk SQL + pemasangan halaman kitab. Dipakai oleh scripts/gen-kitab-static.mjs (aset statik)
// DAN src/static/kitab-route.ts (Worker, kitab di luar belanjawan aset) — supaya HTML keluaran SAMA bait demi bait.
// Fungsi tulen / pembina penyataan sahaja; tiada I/O.
import { PER_PAGE, kitabPage, splitRulings } from "./templates.mjs";

export { PER_PAGE };

/** Sahihayn sahaja boleh dipaut (lihat DORAR_LINKABLE dalam src/lib/hadis.ts). Nama sumber tepat → id kitab. */
const LINKABLE = { "صحيح البخاري": 900003, "صحيح مسلم": 900007 };
// Pautan dikira DALAM SQL (index book_id+number; nombor unik per kitab) supaya Worker tidak perlu pusingan kedua.
const linkId = (book) =>
  `(SELECT t.id FROM hadiths t WHERE t.book_id=${book} AND t.number=CAST(TRIM(r.ref) AS INTEGER))`;
const NUMERIC_REF = "r.ref IS NOT NULL AND TRIM(r.ref) <> '' AND TRIM(r.ref) NOT GLOB '*[^0-9]*'";

/** `SELECT *`: lajur pilihan (numbering_edition) tiada = tiada ralat; lajur tidak diminta pun tidak membebankan (1 baris). */
export const BOOK_SQL = "SELECT * FROM books WHERE id=?";
export const HAS_TOC_SQL = "SELECT 1 AS x FROM book_chapter WHERE book_id=? LIMIT 1";
export const TOC_SQL = "SELECT chapter_ref, chapter_ar, n, first_seq FROM book_chapter WHERE book_id=? ORDER BY first_seq";

const RANGE = "WHERE h.book_id=? AND h.seq>? AND h.seq<=?";
const JOIN = "FROM hadiths h JOIN";

/**
 * Enam query berjulat seq (lo, hi] bagi satu kitab; julat sempit (1 halaman = 20 hadis di Worker, 500 per chunk di
 * penjana). Tiada imbasan, tiada count(*). Susunan hasil = [hadiths, isn, trs, ovr, bab, rul].
 */
export function kitabStmts(bookId, lo, hi) {
  const a = [bookId, lo, hi];
  return [
    { sql: "SELECT id, book_id, chapter_ar, chapter_ref, number, matn_ar, grade FROM hadiths WHERE book_id=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?", args: [...a, hi - lo] },
    { sql: `SELECT hn.hadith_id, hn.narrator_id, COALESCE(hn.chain_no,0) chain_no, hn.position, hn.raw_name, n.name_ar resolved
              ${JOIN} hadith_narrators hn ON hn.hadith_id = h.id LEFT JOIN narrators n ON n.id = hn.narrator_id
             ${RANGE} ORDER BY hn.hadith_id, chain_no, hn.position`, args: a },
    { sql: `SELECT t.entity_id, t.lang, t.text, t.is_verified ${JOIN} translations t ON t.entity_id = h.id
             ${RANGE} AND t.entity_type='hadith' AND t.lang IN ('ms','en')`, args: a },
    { sql: `SELECT o.hadith_id, o.nodes_json ${JOIN} hadith_sanad_override o ON o.hadith_id = h.id ${RANGE}`, args: a },
    { sql: `SELECT b.hadith_id, b.kitab_title, b.bab_no, b.bab_title ${JOIN} hadith_bab b ON b.hadith_id = h.id ${RANGE}`, args: a },
    { sql: `SELECT r.hadith_id, r.rawi, r.muhaddith, r.source_book, r.ref, r.hukm, r.is_primary,
                   CASE WHEN ${NUMERIC_REF} THEN CASE r.source_book WHEN 'صحيح البخاري' THEN ${linkId(LINKABLE["صحيح البخاري"])} WHEN 'صحيح مسلم' THEN ${linkId(LINKABLE["صحيح مسلم"])} END END AS link_id
              ${JOIN} hadith_ruling r ON r.hadith_id = h.id ${RANGE} ORDER BY r.hadith_id, r.is_primary DESC, r.ord`, args: a },
  ];
}

/** Syarah (turath) untuk SATU halaman dalam satu penyataan: kitab_no = chapter_ref hadis pertama halaman. Baris kosong = tiada. */
export const sharahStmt = (bookId, lo, hi) => ({
  sql: `SELECT tb.id AS id, tb.name AS name,
               (SELECT COUNT(DISTINCT s.bab_no) FROM sharh_segment s WHERE s.sharh_book_id=tb.id AND s.kitab_no=k.kno AND s.bab_no>0) AS nbab,
               EXISTS(SELECT 1 FROM sharh_segment s WHERE s.sharh_book_id=tb.id AND s.kitab_no=k.kno) AS has_any
          FROM turath_book tb
          JOIN (SELECT chapter_ref AS kno FROM hadiths WHERE book_id=? AND seq>? AND seq<=? AND chapter_ref IS NOT NULL ORDER BY seq LIMIT 1) k
         WHERE tb.book_ref=? AND k.kno <> 0 LIMIT 1`,
  args: [bookId, lo, hi, bookId],
});

/** Baris sharahStmt -> {book:{id,name}, nBab} atau null (peraturan sama seperti penjana: ada bab ATAU ada segmen). */
export const sharahFromRow = (r) => (r && (Number(r.nbab) || Number(r.has_any)) ? { book: { id: r.id, name: r.name }, nBab: Number(r.nbab) } : null);

/** kitab_no halaman: chapter_ref hadis pertama yang ada, selainnya 0. */
export const kitabNoOf = (hadiths) => hadiths.find((h) => h.chapter_ref != null)?.chapter_ref ?? 0;

const group = (list, key) => {
  const m = new Map();
  for (const r of list) { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
};

/** Baris mentah {isn,trs,ovr,bab,rul} -> peta yang dimakan kitabPage. Boleh terima baris lebih daripada satu halaman (chunk). */
export function shapeRows({ isn, trs, ovr, bab, rul }) {
  const trMap = new Map();
  for (const r of trs) {
    const t = trMap.get(r.entity_id) ?? { ms: null, en: null, ms_verified: false, en_verified: false };
    t[r.lang] = r.text; t[`${r.lang}_verified`] = !!r.is_verified;
    trMap.set(r.entity_id, t);
  }
  const overrides = new Map();
  for (const r of ovr) {
    try { overrides.set(r.hadith_id, JSON.parse(r.nodes_json)); }
    catch (e) { throw new Error(`override sanad rosak untuk hadis ${r.hadith_id}: ${e.message}`); }
  }
  const rulings = new Map();
  for (const [id, arr] of group(rul, "hadith_id")) {
    const { shown, hidden } = splitRulings(arr.map((r) => ({ ...r })));
    for (const r of shown) if (r.link_id != null) r.href = `/x/h/${r.link_id}/`;
    rulings.set(id, { shown, hiddenCount: hidden.length });
  }
  return { isnads: group(isn, "hadith_id"), trs: trMap, overrides, rulings, babs: new Map(bab.map((b) => [b.hadith_id, b])) };
}

/** Pilihan paparan seragam: lencongan URL lama (JS) hanya pada halaman 1. */
export function renderKitab({ book, total, page, hadiths, shaped, hasToc, sharah }, cssHrefs) {
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return kitabPage({
    book, total, page, totalPages, hadiths, hasToc, sharah, kitabNo: kitabNoOf(hadiths), ...shaped,
  }, cssHrefs, { legacyScript: page === 1 });
}

/** Bentuk book yang dipakai templat daripada baris `books` (numbering_edition mungkin tiada lajur -> null). */
export const bookOf = (row) => ({ id: Number(row.id), title_ar: row.title_ar, numbering_edition: row.numbering_edition ? String(row.numbering_edition) : null });

/** toc.json: [chapter_ref, chapter_ar, n, nombor halaman]. */
export function tocJson(chapters, total) {
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return JSON.stringify(chapters.map((c) => [c.chapter_ref, c.chapter_ar, Number(c.n), Math.min(totalPages, Math.floor((Math.max(Number(c.first_seq), 1) - 1) / PER_PAGE) + 1)]));
}
