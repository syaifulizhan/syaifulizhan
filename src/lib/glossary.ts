import { hadithDb } from "./db";

export interface GlossaryTerm {
  term_ar: string;
  huruf: string;
  translit: string | null;
  term_ms: string | null;
  term_en: string | null;
  def_ar: string | null;
  def_ms: string | null;
  def_en: string | null;
}

// Glosari di Cloudflare D1 (kecil ~2.5k baris; boleh kembang tanpa Turso).
export async function getGlossary(): Promise<GlossaryTerm[]> {
  try {
    const r = await hadithDb.execute(
      "SELECT term_ar, huruf, translit, term_ms, term_en, def_ar, def_ms, def_en FROM glossary ORDER BY term_ar"
    );
    return r.rows as unknown as GlossaryTerm[];
  } catch {
    return [];
  }
}
