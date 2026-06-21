import { corpus } from "./db";

export interface GlossaryTerm {
  term_ar: string;
  huruf: string;
  translit: string | null;
  term_ms: string | null;
  term_en: string | null;
  def_ms: string | null;
  def_en: string | null;
}

export async function getGlossary(): Promise<GlossaryTerm[]> {
  const r = await corpus.execute(
    "SELECT term_ar, huruf, translit, term_ms, term_en, def_ms, def_en FROM glossary ORDER BY term_ar"
  );
  return r.rows as unknown as GlossaryTerm[];
}
