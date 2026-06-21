// Glosari istilah teknikal hadis (jarh wa ta'dil + mustalah) → BM baku.
// Rujukan: terminologi standard ulum al-hadith (selaras Kamus Istilah Hadis).
// Disuntik ke prompt terjemahan supaya istilah konsisten & betul.
export const GLOSSARY = {
  // ── Jarh wa ta'dil (martabat perawi) ──
  "ثقة": "thiqah (perawi dipercayai)",
  "ثقة ثبت": "thiqah thabt (terpercaya lagi teguh)",
  "ثقة حافظ": "thiqah hafiz (terpercaya lagi hafiz)",
  "ثقة حجة": "thiqah hujjah (terpercaya lagi hujah)",
  "صدوق": "saduq (jujur)",
  "صدوق حسن الحديث": "saduq, hadisnya hasan",
  "صدوق يهم": "saduq, kadangkala tersilap",
  "مقبول": "maqbul (diterima)",
  "صحابي": "sahabat (Sahabat Nabi)",
  "مجهول": "majhul (tidak dikenali)",
  "مجهول الحال": "majhul al-hal (tidak dikenali keadaannya)",
  "مجهول العين": "majhul al-'ayn (tidak dikenali individunya)",
  "مستور": "mastur (tertutup keadaannya)",
  "لين الحديث": "layyin al-hadith (lemah sedikit hadisnya)",
  "لا بأس به": "la ba's bih (tiada mengapa, boleh diterima)",
  "ضعيف": "daif (lemah)",
  "ضعيف الحديث": "daif al-hadith (lemah hadisnya)",
  "منكر الحديث": "munkar al-hadith (hadisnya munkar)",
  "متروك": "matruk (ditinggalkan)",
  "متروك الحديث": "matruk al-hadith (ditinggalkan hadisnya)",
  "كذاب": "kazzab (pendusta)",
  "وضاع": "wadda' (pemalsu hadis)",
  "مختلف فيه": "mukhtalaf fih (diperselisihkan)",
  "مختلف في صحبته": "diperselisihkan kesahabatannya",
  // ── Mustalah (darjat & jenis hadis) ──
  "صحيح": "sahih",
  "حسن": "hasan",
  "موضوع": "mawdu' (palsu)",
  "مرفوع": "marfu' (disandarkan kepada Nabi)",
  "موقوف": "mawquf (terhenti pada sahabat)",
  "مقطوع": "maqtu' (terhenti pada tabiin)",
  "متصل": "muttasil (sanad bersambung)",
  "منقطع": "munqati' (sanad terputus)",
  "مرسل": "mursal",
  "معضل": "mu'dal",
  "مدلس": "mudallas (tadlis)",
  "متواتر": "mutawatir",
  "آحاد": "ahad",
  "عزيز": "'aziz",
  "غريب": "gharib",
  "مشهور": "mashhur",
  "شاذ": "syaz",
  "منكر": "munkar",
  // ── Asas ──
  "متن": "matan",
  "سند": "sanad",
  "إسناد": "isnad",
  "تخريج": "takhrij",
  "جرح وتعديل": "jarh wa ta'dil",
};

const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length); // padan istilah panjang dahulu

/** Pulangkan baris glosari untuk istilah yang muncul dalam teks (fokus prompt). */
export function glossaryFor(text) {
  if (!text) return "";
  const hits = [];
  for (const k of KEYS) if (text.includes(k)) hits.push(`${k} = ${GLOSSARY[k]}`);
  return hits.length ? `\nIstilah teknikal (WAJIB guna ejaan ini): ${hits.slice(0, 12).join("; ")}.` : "";
}
