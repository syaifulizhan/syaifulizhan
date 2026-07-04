import { corpus, hadithDb } from "./db";
import { normalizeArabic } from "./arabic";

export interface Book { id: number; title_ar: string; n: number }
export interface Hadith { id: number; book_id: number; chapter_ar: string | null; number: number; matn_ar: string; grade: string | null }
export interface IsnadNode { narrator_id: number; chain_no: number; position: number; raw_name: string | null; resolved: string | null }

// Susunan kitab MUKTABAR (bukan ikut bilangan): al-Kutub al-Sittah dahulu ikut tertib
// ulama (Bukhari→Muslim→Abu Dawud→Tirmidhi→Nasa'i→Ibn Majah), lalu Muwatta, Musnad
// Ahmad, Darimi; selebihnya ikut bilangan hadis. id 900xxx = koleksi utama AhmedBaset.
export async function listBooks(limit = 300): Promise<Book[]> {
  const r = await hadithDb.execute({
    sql: `SELECT b.id, b.title_ar, count(h.id) n
            FROM books b LEFT JOIN hadiths h ON h.book_id = b.id
           GROUP BY b.id
           ORDER BY CASE b.id
             WHEN 900003 THEN 1 WHEN 900007 THEN 2 WHEN 900001 THEN 3 WHEN 900009 THEN 4
             WHEN 900008 THEN 5 WHEN 900005 THEN 6 WHEN 900006 THEN 7 WHEN 900002 THEN 8
             WHEN 900004 THEN 9 ELSE 900 + (1000000 - count(h.id)) / 1000 END,
             n DESC, b.id LIMIT ?`,
    args: [limit],
  });
  return r.rows as unknown as Book[];
}

export async function getBook(id: number): Promise<{ id: number; title_ar: string } | null> {
  const r = await hadithDb.execute({ sql: "SELECT id, title_ar FROM books WHERE id = ?", args: [id] });
  return (r.rows[0] as unknown as { id: number; title_ar: string }) ?? null;
}

export async function getBookHadiths(bookId: number, limit = 20, offset = 0, search = ""): Promise<Hadith[]> {
  const q = search.trim() ? normalizeArabic(search) : "";
  const r = await hadithDb.execute({
    sql: q
      ? `SELECT id, book_id, chapter_ar, number, matn_ar, grade FROM hadiths
          WHERE book_id = ? AND matn_search LIKE ? ORDER BY chapter_ref, number LIMIT ? OFFSET ?`
      : `SELECT id, book_id, chapter_ar, number, matn_ar, grade FROM hadiths
          WHERE book_id = ? ORDER BY chapter_ref, number LIMIT ? OFFSET ?`,
    args: q ? [bookId, `%${q}%`, limit, offset] : [bookId, limit, offset],
  });
  return r.rows as unknown as Hadith[];
}

export async function getBookHadithCount(bookId: number, search = ""): Promise<number> {
  const q = search.trim() ? normalizeArabic(search) : "";
  const r = await hadithDb.execute({
    sql: q ? "SELECT count(*) c FROM hadiths WHERE book_id = ? AND matn_search LIKE ?" : "SELECT count(*) c FROM hadiths WHERE book_id = ?",
    args: q ? [bookId, `%${q}%`] : [bookId],
  });
  return Number(r.rows[0].c);
}

// Table of Content: struktur كتاب asal kitab (kaedah paling tepat) — ikut chapter_ref.
export interface Chapter { chapter_ref: number; chapter_ar: string; n: number }
export async function getBookChapters(bookId: number): Promise<Chapter[]> {
  const r = await hadithDb.execute({
    sql: `SELECT chapter_ref, chapter_ar, COUNT(*) n FROM hadiths
           WHERE book_id = ? AND chapter_ar IS NOT NULL AND length(chapter_ar) > 0
           GROUP BY chapter_ref, chapter_ar ORDER BY chapter_ref`,
    args: [bookId],
  });
  return r.rows as unknown as Chapter[];
}

// Halaman (1-based) di mana satu كتاب bermula (utk navigasi ToC).
export async function getChapterPage(bookId: number, chapterRef: number, perPage: number): Promise<number> {
  const r = await hadithDb.execute({
    sql: "SELECT count(*) c FROM hadiths WHERE book_id = ? AND chapter_ref < ?",
    args: [bookId, chapterRef],
  });
  return Math.floor(Number(r.rows[0].c) / perPage) + 1;
}

/** Halaman (1-based) di mana hadith ini berada dlm kitab (ikut susunan chapter_ref, number). */
export async function getHadithPage(bookId: number, hadithId: number, perPage: number): Promise<number> {
  const t = await hadithDb.execute({ sql: "SELECT chapter_ref, number FROM hadiths WHERE id = ?", args: [hadithId] });
  const row = t.rows[0] as unknown as { chapter_ref: number; number: number } | undefined;
  if (!row) return 1;
  // COALESCE: kitab tanpa struktur كتاب (cth Musnad Ahmad, chapter_ref NULL) — NULL
  // gagal perbandingan → dulu sentiasa muka 1. Selaras dgn ORDER BY getBookHadiths.
  const cr = row.chapter_ref ?? -1;
  const c = await hadithDb.execute({
    sql: `SELECT count(*) n FROM hadiths WHERE book_id = ?
            AND (COALESCE(chapter_ref,-1) < ? OR (COALESCE(chapter_ref,-1) = ? AND number < ?))`,
    args: [bookId, cr, cr, row.number],
  });
  return Math.floor(Number(c.rows[0].n) / perPage) + 1;
}

export async function searchBooks(q: string, limit = 30): Promise<(Book & { title_en: string | null })[]> {
  if (!q.trim()) return [];
  const r = await hadithDb.execute({
    sql: `SELECT b.id, b.title_ar, b.title_en, count(h.id) n
            FROM books b LEFT JOIN hadiths h ON h.book_id = b.id
           WHERE b.title_ar LIKE '%' || ? || '%' OR b.title_en LIKE '%' || ? || '%'
           GROUP BY b.id ORDER BY n DESC LIMIT ?`,
    args: [q.trim(), q.trim(), limit],
  });
  return r.rows as unknown as (Book & { title_en: string | null })[];
}

/** Isnad untuk banyak hadis sekaligus (elak N+1). Map: hadith_id → nodes terurut. */
export async function getIsnadFor(hadithIds: number[]): Promise<Map<number, IsnadNode[]>> {
  const map = new Map<number, IsnadNode[]>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  try {
    // isnad + perawi = Turso (corpus). Tahan-ralat: jika Turso down, papar matn tanpa isnad.
    const r = await corpus.execute({
      sql: `SELECT hn.hadith_id, hn.narrator_id, COALESCE(hn.chain_no,0) chain_no, hn.position, hn.raw_name, n.name_ar resolved
              FROM hadith_narrators hn LEFT JOIN narrators n ON n.id = hn.narrator_id
             WHERE hn.hadith_id IN (${ph}) ORDER BY hn.hadith_id, chain_no, hn.position`,
      args: hadithIds,
    });
    for (const row of r.rows as unknown as (IsnadNode & { hadith_id: number })[]) {
      if (!map.has(row.hadith_id)) map.set(row.hadith_id, []);
      map.get(row.hadith_id)!.push(row);
    }
  } catch { /* Turso belum pulih → isnad dikosongkan */ }
  return map;
}

export async function searchHadith(q: string, limit = 30): Promise<(Hadith & { book: string | null })[]> {
  const norm = normalizeArabic(q);
  if (!norm) return [];
  // D1 belum ada FTS5 → guna LIKE atas matn_search (dinormalisasi). Diganti FTS kemudian.
  const r = await hadithDb.execute({
    sql: `SELECT h.id, h.book_id, h.chapter_ar, h.number, h.matn_ar, h.grade, b.title_ar book
            FROM hadiths h LEFT JOIN books b ON b.id = h.book_id
           WHERE h.matn_search LIKE '%' || ? || '%' LIMIT ?`,
    args: [norm, limit],
  });
  return r.rows as unknown as (Hadith & { book: string | null })[];
}

export interface Tr { ms: string | null; en: string | null; ms_verified: boolean; en_verified: boolean }

/** Terjemahan AI/manual utk banyak hadis. Map: hadith_id → {ms,en,...}. */
export async function getTranslationsFor(hadithIds: number[]): Promise<Map<number, Tr>> {
  const map = new Map<number, Tr>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  try {
    const r = await hadithDb.execute({
      sql: `SELECT entity_id, lang, text, is_verified FROM translations
             WHERE entity_type='hadith' AND entity_id IN (${ph}) AND lang IN ('ms','en')`,
      args: hadithIds,
    });
    for (const row of r.rows as unknown as { entity_id: number; lang: string; text: string; is_verified: number }[]) {
      const t = map.get(row.entity_id) ?? { ms: null, en: null, ms_verified: false, en_verified: false };
      if (row.lang === "ms") { t.ms = row.text; t.ms_verified = !!row.is_verified; }
      else if (row.lang === "en") { t.en = row.text; t.en_verified = !!row.is_verified; }
      map.set(row.entity_id, t);
    }
  } catch { /* jadual translations belum dimuat ke D1 → kosong */ }
  return map;
}

// Override sanad terkurasi admin (D1) — ganti hasil parser bila ada. Elak re-parse
// pukal + re-sync Turso: pembetulan disemak manusia, disimpan ringkas di D1.
export async function getSanadOverridesFor(hadithIds: number[]): Promise<Map<number, IsnadNode[]>> {
  const map = new Map<number, IsnadNode[]>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  try {
    const r = await hadithDb.execute({
      sql: `SELECT hadith_id, nodes_json FROM hadith_sanad_override WHERE hadith_id IN (${ph})`,
      args: hadithIds,
    });
    for (const row of r.rows as unknown as { hadith_id: number; nodes_json: string }[]) {
      try { map.set(row.hadith_id, JSON.parse(row.nodes_json) as IsnadNode[]); } catch { /* abai */ }
    }
  } catch { /* jadual belum di D1 */ }
  return map;
}

export interface Ruling {
  rawi: string | null; muhaddith: string | null; source_book: string | null;
  ref: string | null; hukm: string | null; is_primary: number; href?: string | null;
}
// Peta sumber dorar → book_id KITA — HANYA Sahihayn (penomboran AhmedBaset sepadan
// dorar, disahkan Bukhari #13). Kitab lain: penomboran/riwayat tak pasti → jangan
// paut (elak salah-lekat = salah fakta). ة/ه & أ/ا dinormalisasi utk padan.
const DORAR_LINKABLE: Record<string, number> = {
  "صحيح البخاري": 900003, "صحيح مسلم": 900007,
};
// Takhrij & ahkam (dorar): SEMUA jalur dipelihara (rawi+muhaddith+kitab+hukm).
// Amanah: jangan runtuh jadi 1 gred — sanad berbeza boleh beri hukm berbeza.
export async function getRulingsFor(hadithIds: number[]): Promise<Map<number, Ruling[]>> {
  const map = new Map<number, Ruling[]>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  try {
    const r = await hadithDb.execute({
      sql: `SELECT hadith_id, rawi, muhaddith, source_book, ref, hukm, is_primary
              FROM hadith_ruling WHERE hadith_id IN (${ph})
             ORDER BY is_primary DESC, ord`,
      args: hadithIds,
    });
    for (const row of r.rows as unknown as (Ruling & { hadith_id: number })[]) {
      const arr = map.get(row.hadith_id) ?? [];
      arr.push({ rawi: row.rawi, muhaddith: row.muhaddith, source_book: row.source_book, ref: row.ref, hukm: row.hukm, is_primary: row.is_primary });
      map.set(row.hadith_id, arr);
    }
    // Takhrij BOLEH-KLIK (Sahihayn sahaja): (sumber+rakam) → hadis KITA.
    const nb = (s: string | null) => normalizeArabic(s ?? "");
    const wanted: { book: number; num: number; r: Ruling }[] = [];
    for (const arr of map.values())
      for (const rl of arr) {
        const bid = DORAR_LINKABLE[nb(rl.source_book)];
        const num = rl.ref && /^\d+$/.test(rl.ref.trim()) ? Number(rl.ref.trim()) : null;
        if (bid && num) wanted.push({ book: bid, num, r: rl });
      }
    if (wanted.length) {
      const keys = [...new Set(wanted.map((w) => `${w.book}:${w.num}`))];
      const ph = keys.map(() => "(?,?)").join(",");
      const args = keys.flatMap((k) => k.split(":").map(Number));
      const hr = await hadithDb.execute({
        sql: `SELECT id, book_id, number FROM hadiths WHERE (book_id, number) IN (VALUES ${ph})`,
        args,
      });
      const tgt = new Map<string, number>();
      for (const row of hr.rows as unknown as { id: number; book_id: number; number: number }[]) tgt.set(`${row.book_id}:${row.number}`, row.id);
      for (const w of wanted) { const id = tgt.get(`${w.book}:${w.num}`); if (id) w.r.href = `/kitab/${w.book}?h=${id}#h-${id}`; }
    }
  } catch { /* jadual hadith_ruling belum di D1 → kosong */ }
  return map;
}

export async function hadithCount(): Promise<number> {
  const r = await hadithDb.execute("SELECT count(*) c FROM hadiths");
  return Number(r.rows[0].c);
}
