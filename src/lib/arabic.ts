// Normalisasi teks Arab untuk carian (selari dgn scripts/lib/arabic.mjs).
const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

export function normalizeArabic(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[آأإٱ]/g, "ا") // آأإٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
