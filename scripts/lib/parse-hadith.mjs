import { load } from "cheerio";

/**
 * Parse halaman TOC kitab → { id, title_ar, chapters: [{chapter, title}] }, atau null.
 */
export function parseBook(html, id) {
  const $ = load(html);
  const title = ($("title").text().split(":").pop() || "").trim();
  if (!title) return null;
  const chapters = [];
  const seen = new Set();
  $('a[href*="/single-book/"]').each((_, a) => {
    const href = $(a).attr("href") || "";
    const m = href.match(/\/single-book\/\d+\/[^/]+\/(\d+)/);
    if (!m) return;
    const ch = Number(m[1]);
    const text = $(a).text().replace(/\s+/g, " ").trim();
    if (!text || text === "أقرأ الكتاب") return; // langkau CTA generik
    if (seen.has(ch)) return;
    seen.add(ch);
    chapters.push({ chapter: ch, title: text });
  });
  return { id, title_ar: title, chapters };
}

/**
 * Parse halaman bab → senarai hadis [{ seq, matn_ar, chain: [{id,name}] }].
 * Setiap <p class="more-height"> = satu hadis; perawi = <a class="rawy" id="..">.
 * Rantai isnad ikut urutan teks: [0]=perawi terdekat mukharrij … [n]=terdekat Nabi.
 */
export function parseChapter(html, bookId, chapter) {
  const $ = load(html);
  const hadiths = [];
  $(".more-height").each((idx, b) => {
    const el = $(b);
    const matn_ar = el.text().replace(/\s+/g, " ").trim();
    if (!matn_ar) return;
    const chain = el
      .find("a.rawy")
      .map((_, a) => ({ id: Number($(a).attr("id")), name: $(a).text().replace(/\s+/g, " ").trim() }))
      .get()
      .filter((x) => Number.isInteger(x.id) && x.id > 0);
    hadiths.push({ seq: idx + 1, matn_ar, chain });
  });
  return hadiths;
}
