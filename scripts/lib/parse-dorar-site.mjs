// Parser hasil carian SITE dorar (/hadith/search?...&all) — lebih kaya dari
// dorar_api.json: tambah dorar hadith id (/h/{id}) + التصنيف الموضوعي (kategori).
// Pulang senarai blok: {rawi, muhaddith, source_book, ref, hukm, dorar_id, categories[]}.
const clean = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/&nbsp;|&zwnj;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseDorarSite(html) {
  // setiap hasil bermula dgn tajuk <h5...> N - {matn}. Pisah ikut heading itu.
  const parts = html.split(/<h5[^>]*>\s*\d+\s*-/);
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    // info: "الراوي: X | المحدث: Y ... المصدر: Z | الصفحة أو الرقم: R ... خلاصة حكم المحدث: H"
    const g = (label, stop) => {
      const re = new RegExp(label + "\\s*:?\\s*([\\s\\S]*?)(?=" + stop + ")");
      const m = seg.match(re);
      return m ? clean(m[1]) : null;
    };
    const rawi = g("الراوي", "المحدث|<br|\\|");
    const muhaddith = g("(?<!حكم )المحدث", "المصدر|<br|\\|"); // elak "حكم المحدث"
    const source_book = g("المصدر", "الصفحة أو الرقم|<br|\\|");
    const ref = g("الصفحة أو الرقم", "خلاصة|<br|\\|");
    const hukm = g("خلاصة حكم المحدث", "<br|التصنيف|موقع الدرر|<\\/");
    if (!muhaddith && !source_book) continue;
    // dorar id (/h/{id}) dlm segmen ini
    const idm = seg.match(/\/h\/([A-Za-z0-9]{6,12})\b/);
    const dorar_id = idm ? idm[1] : null;
    // kategori التصنيف الموضوعي: senarai <a href=/hadith-category/cat/..>nama</a>
    const catBlock = seg.match(/التصنيف الموضوعي\s*:?\s*([\s\S]*?)(?:<\/div|موقع الدرر|<h5|أحاديث مشابهة)/);
    const categories = catBlock
      ? [...catBlock[1].matchAll(/<a[^>]*hadith-category[^>]*>([\s\S]*?)<\/a>/g)].map((m) => clean(m[1])).filter(Boolean)
      : [];
    out.push({ rawi, muhaddith, source_book, ref, hukm, dorar_id, categories });
  }
  return out;
}
