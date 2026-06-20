// Scrape perawi islam-db.com → JSONL (resumable, beradab).
// Uji  : node scripts/scrape-narrators.mjs --from=1 --limit=5 --delay=300
// Penuh: node scripts/scrape-narrators.mjs            (sambung dari checkpoint)
import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fetchHtml, sleep } from "./lib/crawler.mjs";
import { parseNarrator } from "./lib/parse-narrator.mjs";

const OUT_DIR = "data/islamdb";
const OUT = `${OUT_DIR}/narrators.jsonl`;
const PROG = `${OUT_DIR}/narrators.progress.json`;
const FAILED = `${OUT_DIR}/narrators.failed.txt`; // id gagal rangkaian — retry kemudian
const BASE = "https://hadith.islam-db.com/narrators";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const MAX = Number(args.to ?? 42517);
const DELAY = Number(args.delay ?? 700);

mkdirSync(OUT_DIR, { recursive: true });
let lastId = 0, ok = 0, missing = 0;
if (existsSync(PROG) && !args.from) {
  const p = JSON.parse(readFileSync(PROG, "utf8"));
  ({ lastId = 0, ok = 0, missing = 0 } = p);
}
const start = args.from ? Number(args.from) : lastId + 1;
const end = args.limit ? Math.min(MAX, start + Number(args.limit) - 1) : MAX;

const save = (id) => writeFileSync(PROG, JSON.stringify({ lastId: id, ok, missing }, null, 2));

const ABORT_AFTER = Number(args.abortAfter ?? 40); // henti jika gagal berturut sebanyak ini
console.log(`Scrape perawi ${start}..${end} (delay ${DELAY}ms) → ${OUT}`);
let fails = 0; // ralat rangkaian berturut-turut
for (let id = start; id <= end; id++) {
  try {
    const { status, html } = await fetchHtml(`${BASE}/${id}/x`);
    if (status === 404 || !html) missing++;
    else {
      const n = parseNarrator(html, id);
      if (n) { appendFileSync(OUT, JSON.stringify(n) + "\n"); ok++; }
      else missing++;
    }
    fails = 0; // berjaya — reset kiraan gagal berturut
  } catch (e) {
    fails++;
    missing++;
    appendFileSync(FAILED, `${id}\n`); // simpan utk retry kemudian
    console.error(`\n⚠ id ${id}: ${e.message} (gagal berturut ${fails}/${ABORT_AFTER}) — langkau & teruskan`);
    save(id); // checkpoint supaya sambung lepas id ini, bukan ulang
    if (fails >= ABORT_AFTER) {
      console.error(`\n✗ ${ABORT_AFTER} kegagalan berturut — site mungkin tumbang. Berhenti; jalankan semula utk sambung.`);
      process.exit(1);
    }
    await sleep(Math.min(15000, DELAY * fails)); // beransur perlahan bila banyak gagal
    continue;
  }
  if (id % 25 === 0) { save(id); process.stdout.write(`\r  id ${id} | ok ${ok} | missing ${missing}   `); }
  await sleep(DELAY);
}
save(end);
console.log(`\n✓ Siap ${start}..${end}. ok=${ok} missing=${missing}`);
