// Normalisasi teks Arab untuk lajur carian (arabic_search).
// Buang tashkeel/tatweel, seragamkan alef/hamza/ya/ta-marbuta,
// supaya carian tidak terikat pada baris (harakat).

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g; // harakat + tanda kecil
const TATWEEL = /ـ/g;

export function normalizeArabic(input) {
  if (!input) return "";
  return input
    .replace(TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[آأإٱ]/g, "ا") // آأإٱ -> ا
    .replace(/ى/g, "ي") // ى -> ي
    .replace(/ة/g, "ه") // ة -> ه
    .replace(/ؤ/g, "و") // ؤ -> و
    .replace(/ئ/g, "ي") // ئ -> ي
    .replace(/[^ء-ي\s]/g, " ") // buang selain huruf Arab
    .replace(/\s+/g, " ")
    .trim();
}
