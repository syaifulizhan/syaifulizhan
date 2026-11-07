// Parse the page stream of ONE hadith book from Maktabah Shamela into hadiths / headings / muhaqqiq notes.
// Pure functions (no I/O) so they can be unit-checked. Written for books shaped like Shamela #1446
// (printed raqm at the start of a line as "N - ", headings as <span data-type='title' id=toc-N>, muhaqqiq
// comments appended as "<s0>N - ..." lines). Anything it cannot place is reported in `anomalies`, never guessed.

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toInt = (s) => Number(s.replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)));

const TASHKEEL = /[\u064B-\u065F\u0670]/g; // NOT \u0660-\u0669 (Arabic-Indic digits)
const LETTERS = /[ء-غف-ي]/g;
const tashkeelRatio = (s) => ((s.match(TASHKEEL) || []).length) / Math.max(1, (s.match(LETTERS) || []).length);

const PLAIN_HEADING = /^(?:بَابُ|بَابٌ|بَابِ|كِتَابُ|جُمَّاعُ|جِمَاعُ)\s/;
// a second muhaqqiq note chained to the first ("قال الألباني: … \\r قال الأعظمي: …") has no "N -" prefix
const NOTE_AUTHOR = /^قال (?:الأعظمي|الاعظمي|الأعظي|الألباني|الالباني)\s*:/;
const ISNAD_TOKEN = "(?:ثنا|نا|حدثنا|أخبرنا|أنا|حدثني|ثني|ناه|أخبرني)";
const stripTags = (s) => s.replace(/<[^>]*>/g, "");
const cleanText = (s) =>
  stripTags(s)
    .replace(/⦗[٠-٩]+⦘/g, " ") // printed-page markers inserted by Shamela
    .replace(/[‎‏]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** A page that starts with an isnad token glued before the raqm ("نا\r⦗٢١٤⦘\r\r٤١٠ - محمد…") is re-ordered to "٤١٠ - نا محمد…". */
export function fixGluedRaqm(body) {
  return body.replace(
    new RegExp(`^(${ISNAD_TOKEN})\\s*(?:\\r+⦗[٠-٩]+⦘)*\\r*([٠-٩]+) - ?`),
    (_, tok, n) => `${n} - ${tok} `,
  );
}

/**
 * @param pages [{page_id, body, foot}] in reading order
 * @param titleParent Map<tocId, parentTocId|0> from the book's `title` table
 * @param titleByPage Map<page_id, tocId>: some headings lost their <span>, but the title table still knows the page
 */
export function parseBook(pages, titleParent, titleByPage = new Map()) {
  const hadiths = [];
  const notes = [];
  const headings = []; // {ord, tocId, level, text}
  const footnotes = [];
  const anomalies = [];
  const stack = []; // headings by level
  let cur = null;
  let note = null;
  let mode = "front"; // front | hadith | note

  const depth = (tocId) => {
    let d = 1, p = titleParent.get(tocId);
    while (p) { d++; p = titleParent.get(p); }
    return d;
  };
  const closeHadith = () => { if (cur) { cur.matn = cleanText(cur.parts.join(" ")); delete cur.parts; hadiths.push(cur); cur = null; } };
  const closeNote = () => { if (note) { note.text = cleanText(note.parts.join(" ")); delete note.parts; notes.push(note); note = null; } };

  for (const page of pages) {
    if (page.foot?.trim()) footnotes.push({ page_id: page.page_id, text: cleanText(page.foot) });
    const body = fixGluedRaqm(page.body).replace(/[ \t]*<s\d+>/g, "\r<s0>");
    const lines = body.split(/\r+/).map((l) => l.trim()).filter(Boolean);
    const plainTocId = /data-type=['"]title['"]/.test(page.body) ? null : titleByPage.get(page.page_id);
    for (const [i, line] of lines.entries()) {
      const title = line.match(/^<span data-type=['"]title['"] id=toc-(\d+)>/)
        ?? (plainTocId && i === 0 && PLAIN_HEADING.test(line) ? [line, String(plainTocId)] : null);
      if (title) {
        closeHadith(); closeNote(); mode = "front";
        const tocId = Number(title[1]);
        const level = depth(tocId);
        const h = { ord: headings.length + 1, tocId, level, text: cleanText(line) };
        headings.push(h);
        stack.length = level - 1;
        stack[level - 1] = h;
        continue;
      }
      if (/^⦗[٠-٩]+⦘$/.test(line)) continue;
      if (/^<s\d+>/.test(line)) {
        closeNote();
        const m = cleanText(line).match(/^([٠-٩]+) - (.*)$/s);
        note = { raqm: m ? toInt(m[1]) : cur?.raqm ?? null, page_id: page.page_id, parts: [m ? m[2] : cleanText(line)] };
        if (!m) anomalies.push({ type: "note-without-raqm", page_id: page.page_id });
        mode = "note";
        continue;
      }
      const hm = line.match(/^([٠-٩]+) - ?(.*)$/s);
      if (hm) {
        closeHadith(); closeNote();
        const kitab = stack[0]?.level === 1 ? stack[0] : null;
        cur = { raqm: toInt(hm[1]), page_id: page.page_id, chapterOrd: stack.at(-1)?.ord ?? null, kitabOrd: kitab?.ord ?? null, parts: [hm[2]] };
        mode = "hadith";
        continue;
      }
      // plain line: continuation of a hadith, or of a muhaqqiq note (notes are unvowelled, matn is vowelled)
      if (mode === "note" && (NOTE_AUTHOR.test(line) || tashkeelRatio(line) < 0.25)) { note.parts.push(line); continue; }
      if (cur) { cur.parts.push(line); mode = "hadith"; continue; }
      anomalies.push({ type: "orphan-line", page_id: page.page_id, text: line.slice(0, 80) });
    }
  }
  closeHadith(); closeNote();
  return { hadiths, notes, headings, footnotes, anomalies };
}
