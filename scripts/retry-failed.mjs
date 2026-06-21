// Cuba semula id/bab yang gagal (rangkaian/500 sementara) dari *.failed.txt.
// Tulis data pulih ke *.recovered.jsonl (BERASINGAN — elak race dgn scrape utama).
// build-sqlite baca kedua-dua. Selamat dijalankan walau scrape utama masih jalan.
//   node scripts/retry-failed.mjs
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { fetchHtml, sleep } from "./lib/crawler.mjs";
import { parseNarrator } from "./lib/parse-narrator.mjs";
import { parseBook, parseChapter } from "./lib/parse-hadith.mjs";

const BASE = "https://hadith.islam-db.com";
const DIR = "data/islamdb";
const DELAY = 600;

async function retryNarrators() {
  const f = `${DIR}/narrators.failed.txt`;
  if (!existsSync(f)) return console.log("(tiada narrators.failed.txt)");
  const ids = [...new Set(
    readFileSync(f, "utf8").split("\n").map((s) => s.trim()).filter(Boolean).map(Number).filter(Number.isInteger)
  )];
  console.log(`Perawi gagal: ${ids.length} id`);
  let ok = 0, still = 0;
  for (const id of ids) {
    try {
      const { status, html } = await fetchHtml(`${BASE}/narrators/${id}/x`);
      const n = status === 200 && html ? parseNarrator(html, id) : null;
      if (n) { appendFileSync(`${DIR}/narrators.recovered.jsonl`, JSON.stringify(n) + "\n"); ok++; }
      else still++;
    } catch { still++; }
    await sleep(DELAY);
  }
  console.log(`  ✓ perawi pulih ${ok}, masih gagal ${still}`);
}

async function retryHadith() {
  const f = `${DIR}/hadith.failed.txt`;
  if (!existsSync(f)) return console.log("(tiada hadith.failed.txt)");
  const lines = [...new Set(readFileSync(f, "utf8").split("\n").map((s) => s.trim()).filter(Boolean))];
  const books = new Set(); const chaps = [];
  for (const l of lines) {
    let m;
    if ((m = l.match(/^book (\d+)/))) books.add(Number(m[1]));
    else if ((m = l.match(/^chap (\d+):(\d+)/))) chaps.push([Number(m[1]), Number(m[2])]);
  }
  console.log(`Hadis gagal: ${books.size} kitab, ${chaps.length} bab`);
  let ok = 0, still = 0;
  const out = (o) => appendFileSync(`${DIR}/hadith.recovered.jsonl`, JSON.stringify(o) + "\n");

  for (const b of books) {
    try {
      const { status, html } = await fetchHtml(`${BASE}/books/${b}/x`);
      if (status !== 200 || !html) { still++; continue; }
      const toc = parseBook(html, b);
      if (!toc || !toc.chapters.length) { still++; continue; }
      out({ type: "book", id: b, title: toc.title_ar });
      for (const { chapter, title } of toc.chapters) {
        try {
          const r = await fetchHtml(`${BASE}/single-book/${b}/x/${chapter}`);
          if (r.html) for (const h of parseChapter(r.html, b, chapter)) { out({ type: "hadith", book: b, chapter, chapter_ar: title, seq: h.seq, matn_ar: h.matn_ar, chain: h.chain }); ok++; }
        } catch { still++; }
        await sleep(DELAY);
      }
    } catch { still++; }
    await sleep(DELAY);
  }
  for (const [b, c] of chaps) {
    try {
      const r = await fetchHtml(`${BASE}/single-book/${b}/x/${c}`);
      if (r.html) for (const h of parseChapter(r.html, b, c)) { out({ type: "hadith", book: b, chapter: c, chapter_ar: null, seq: h.seq, matn_ar: h.matn_ar, chain: h.chain }); ok++; }
      else still++;
    } catch { still++; }
    await sleep(DELAY);
  }
  console.log(`  ✓ hadis pulih ${ok}, masih gagal ${still} (500 kekal = kitab rosak di islam-db)`);
}

await retryNarrators();
await retryHadith();
console.log("Retry selesai → data di *.recovered.jsonl. Jalankan corpus:build untuk masukkan.");
