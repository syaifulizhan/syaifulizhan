import { corpus, hadithDb } from "./db";
import { normalizeArabic } from "./arabic";

export interface Book { id: number; title_ar: string; n: number }
export interface Hadith { id: number; book_id: number; chapter_ar: string | null; number: number; matn_ar: string; grade: string | null }
export interface IsnadNode { narrator_id: number; chain_no: number; position: number; raw_name: string | null; resolved: string | null }

export async function listBooks(limit = 300): Promise<Book[]> {
  const r = await hadithDb.execute({
    sql: `SELECT b.id, b.title_ar, count(h.id) n
            FROM books b LEFT JOIN hadiths h ON h.book_id = b.id
           GROUP BY b.id ORDER BY n DESC, b.id LIMIT ?`,
    args: [limit],
  });
  return r.rows as unknown as Book[];
}

export async function getBook(id: number): Promise<{ id: number; title_ar: string } | null> {
  const r = await hadithDb.execute({ sql: "SELECT id, title_ar FROM books WHERE id = ?", args: [id] });
  return (r.rows[0] as unknown as { id: number; title_ar: string }) ?? null;
}

export async function getBookHadiths(bookId: number, limit = 20, offset = 0): Promise<Hadith[]> {
  const r = await hadithDb.execute({
    sql: `SELECT id, book_id, chapter_ar, number, matn_ar, grade FROM hadiths
           WHERE book_id = ? ORDER BY chapter_ref, number LIMIT ? OFFSET ?`,
    args: [bookId, limit, offset],
  });
  return r.rows as unknown as Hadith[];
}

export async function getBookHadithCount(bookId: number): Promise<number> {
  const r = await hadithDb.execute({ sql: "SELECT count(*) c FROM hadiths WHERE book_id = ?", args: [bookId] });
  return Number(r.rows[0].c);
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

export async function hadithCount(): Promise<number> {
  const r = await hadithDb.execute("SELECT count(*) c FROM hadiths");
  return Number(r.rows[0].c);
}
