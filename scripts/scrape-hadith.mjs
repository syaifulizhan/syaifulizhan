// Scrape hadis islam-db.com → JSONL (kitab→bab→hadis), resumable peringkat bab, beradab.
// Uji  : node scripts/scrape-hadith.mjs --from=1 --maxBook=1 --delay=300
// Penuh: node scripts/scrape-hadith.mjs            (sambung dari checkpoint)
import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fetchHtml, sleep } from "./lib/crawler.mjs";
import { parseBook, parseChapter } from "./lib/parse-hadith.mjs";

const OUT_DIR = "data/islamdb";
const OUT = `${OUT_DIR}/hadith.jsonl`;
const PROG = `${OUT_DIR}/hadith.progress.json`;
const FAILED = `${OUT_DIR}/hadith.failed.txt`;
const BASE = "https://hadith.islam-db.com";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const MAXBOOK = Number(args.maxBook ?? 1500);
const DELAY = Number(args.delay ?? 500);
const ABORT_AFTER = Number(args.abortAfter ?? 40);

mkdirSync(OUT_DIR, { recursive: true });
let prog = { book: 1, chapIdx: 0, books: 0, hadiths: 0, missing: 0 };
if (existsSync(PROG) && !args.from) prog = JSON.parse(readFileSync(PROG, "utf8"));
if (args.from) prog.book = Number(args.from), (prog.chapIdx = 0);
const save = () => writeFileSync(PROG, JSON.stringify(prog, null, 2));

console.log(`Scrape hadis kitab ${prog.book}..${MAXBOOK} (delay ${DELAY}ms) → ${OUT}`);
let fails = 0;
const onFail = (label, advance) => {
  fails++;
  appendFileSync(FAILED, label + "\n");
  console.error(`\n⚠ ${label}: gagal (berturut ${fails}/${ABORT_AFTER})`);
  if (fails >= ABORT_AFTER) { save(); console.error("✗ Terlalu banyak gagal — berhenti; jalankan semula utk sambung."); process.exit(1); }
};

for (let book = prog.book; book <= MAXBOOK; book++) {
  // ── TOC kitab ──
  let toc;
  try {
    const { status, html } = await fetchHtml(`${BASE}/books/${book}/x`);
    if (status === 404 || !html) { prog.book = book + 1; prog.chapIdx = 0; save(); continue; }
    toc = parseBook(html, book);
    fails = 0;
  } catch (e) {
    onFail(`book ${book} (${e.message})`);
    await sleep(Math.min(15000, DELAY * fails));
    continue; // cuba kitab sama semula? tidak — checkpoint kekal di book ini
  }
  if (!toc || !toc.chapters.length) { prog.book = book + 1; prog.chapIdx = 0; save(); continue; }

  appendFileSync(OUT, JSON.stringify({ type: "book", id: book, title: toc.title_ar }) + "\n");
  prog.books++;
  const chStart = book === prog.book ? prog.chapIdx : 0;

  for (let ci = chStart; ci < toc.chapters.length; ci++) {
    const { chapter, title } = toc.chapters[ci];
    try {
      const { status, html } = await fetchHtml(`${BASE}/single-book/${book}/x/${chapter}`);
      if (status >= 200 && html) {
        for (const h of parseChapter(html, book, chapter)) {
          appendFileSync(
            OUT,
            JSON.stringify({ type: "hadith", book, chapter, chapter_ar: title, seq: h.seq, matn_ar: h.matn_ar, chain: h.chain }) + "\n"
          );
          prog.hadiths++;
        }
      } else prog.missing++;
      fails = 0;
    } catch (e) {
      onFail(`chap ${book}:${chapter} (${e.message})`);
      prog.book = book; prog.chapIdx = ci; save();
      await sleep(Math.min(15000, DELAY * fails));
      continue;
    }
    prog.book = book; prog.chapIdx = ci + 1;
    if (ci % 10 === 0) { save(); process.stdout.write(`\r  kitab ${book} · bab ${ci + 1}/${toc.chapters.length} · hadis ${prog.hadiths}   `); }
    await sleep(DELAY);
  }
  prog.book = book + 1; prog.chapIdx = 0; save();
}
console.log(`\n✓ Siap. kitab=${prog.books} hadis=${prog.hadiths} missing=${prog.missing}`);
