import { corpus } from "./db";
import { normalizeArabic } from "./arabic";

export interface Book { id: number; title_ar: string; n: number }
export interface Hadith { id: number; book_id: number; chapter_ar: string | null; number: number; matn_ar: string }
export interface IsnadNode { narrator_id: number; position: number; raw_name: string | null; resolved: string | null }

export async function listBooks(limit = 300): Promise<Book[]> {
  const r = await corpus.execute({
    sql: `SELECT b.id, b.title_ar, count(h.id) n
            FROM books b LEFT JOIN hadiths h ON h.book_id = b.id
           GROUP BY b.id ORDER BY n DESC, b.id LIMIT ?`,
    args: [limit],
  });
  return r.rows as unknown as Book[];
}

export async function getBook(id: number): Promise<{ id: number; title_ar: string } | null> {
  const r = await corpus.execute({ sql: "SELECT id, title_ar FROM books WHERE id = ?", args: [id] });
  return (r.rows[0] as unknown as { id: number; title_ar: string }) ?? null;
}

export async function getBookHadiths(bookId: number, limit = 80): Promise<Hadith[]> {
  const r = await corpus.execute({
    sql: `SELECT id, book_id, chapter_ar, number, matn_ar FROM hadiths
           WHERE book_id = ? ORDER BY chapter_ref, number LIMIT ?`,
    args: [bookId, limit],
  });
  return r.rows as unknown as Hadith[];
}

/** Isnad untuk banyak hadis sekaligus (elak N+1). Map: hadith_id → nodes terurut. */
export async function getIsnadFor(hadithIds: number[]): Promise<Map<number, IsnadNode[]>> {
  const map = new Map<number, IsnadNode[]>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  const r = await corpus.execute({
    sql: `SELECT hn.hadith_id, hn.narrator_id, hn.position, hn.raw_name, n.name_ar resolved
            FROM hadith_narrators hn LEFT JOIN narrators n ON n.id = hn.narrator_id
           WHERE hn.hadith_id IN (${ph}) ORDER BY hn.hadith_id, hn.position`,
    args: hadithIds,
  });
  for (const row of r.rows as unknown as (IsnadNode & { hadith_id: number })[]) {
    if (!map.has(row.hadith_id)) map.set(row.hadith_id, []);
    map.get(row.hadith_id)!.push(row);
  }
  return map;
}

export async function searchHadith(q: string, limit = 30): Promise<(Hadith & { book: string | null })[]> {
  const norm = normalizeArabic(q);
  if (!norm) return [];
  const match = norm.split(" ").filter(Boolean).map((t) => `${t}*`).join(" ");
  const r = await corpus.execute({
    sql: `SELECT h.id, h.book_id, h.chapter_ar, h.number, h.matn_ar, b.title_ar book
            FROM hadiths_fts f JOIN hadiths h ON h.id = f.rowid
            LEFT JOIN books b ON b.id = h.book_id
           WHERE hadiths_fts MATCH ? LIMIT ?`,
    args: [match, limit],
  });
  return r.rows as unknown as (Hadith & { book: string | null })[];
}

export interface Tr { ms: string | null; en: string | null; ms_verified: boolean; en_verified: boolean }

/** Terjemahan AI/manual utk banyak hadis. Map: hadith_id → {ms,en,...}. */
export async function getTranslationsFor(hadithIds: number[]): Promise<Map<number, Tr>> {
  const map = new Map<number, Tr>();
  if (!hadithIds.length) return map;
  const ph = hadithIds.map(() => "?").join(",");
  const r = await corpus.execute({
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
  return map;
}

export async function hadithCount(): Promise<number> {
  const r = await corpus.execute("SELECT count(*) c FROM hadiths");
  return Number(r.rows[0].c);
}
