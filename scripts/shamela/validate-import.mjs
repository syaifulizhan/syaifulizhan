#!/usr/bin/env node
// Validate a delta made by import-book.mjs (read-only):
//   1. N random hadiths re-checked VERBATIM against the raw Shamela page text (tags/page markers/whitespace aside)
//   2. cross-edition check: the same printed raqm in another Shamela edition of the same book starts with the same words
//   node scripts/shamela/validate-import.mjs <delta dir> <shamelaBookId> [--cross <shamelaBookId>] [--n 20] [--seed 7]
import { readFileSync } from "node:fs";
import { normalizeArabic } from "../lib/arabic.mjs";
import { startHelper } from "./helper-client.mjs";
import { fixGluedRaqm } from "./parse-book.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const cross = Number(opt("--cross", 0)), N = Number(opt("--n", 20));
let seed = Number(opt("--seed", 7));
const [dir, sid] = [args[0], Number(args[1])];
const rows = readFileSync(`${dir}/hadiths.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a, n) => { const c = [...a], o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return o; };
const squash = (s) => s.replace(/<[^>]*>/g, "").replace(/⦗[٠-٩]+⦘/g, "").replace(/[\s‎‏]+/g, "");

// 0. leak check: muhaqqiq/editor words must never be inside a matn
const NOTE_MARKERS = /قال\s+(?:الأعظمي|الاعظمي|الأعظي|الألباني|الالباني|المحقق)|<s\d+>|\[التعليق\]|⦗|<\/?span/;
const leaks = rows.filter((r) => NOTE_MARKERS.test(r.matn_ar)).map((r) => r.raqm);
console.log(`leak check: ${leaks.length ? "FAIL " + leaks.join(",") : "0 matn contain note markers"} (${rows.length} rows)`);
if (leaks.length) process.exitCode = 1;

const helper = startHelper();
const fetchPages = async (book, ids) => (await helper.request("get_pages_batch", { book_id: book, page_ids: ids })).results;

// 1. verbatim: our matn (whitespace-free) must be a substring of the raw text of its page window
const sample = pick(rows, N);
let ok = 0; const bad = [];
for (const r of sample) {
  const ids = Array.from({ length: 12 }, (_, i) => r.page_id + i); // a hadith may run onto following pages
  const raw = (await fetchPages(sid, ids)).map((p) => squash(fixGluedRaqm(p.body).replace(/[ \t]*<s\d+>[^\r]*(?:\r+قال [^\r]*)*/g, ""))).join("");
  const body = squash(r.matn_ar);
  // the importer drops page-break fragments only; accept if the whole body is found contiguously
  // a muhaqqiq note may sit between a hadith and its continuation page, so require every 80-char slice (not the whole string) to be present
  const slices = body.match(/.{1,80}/gs) ?? [];
  if (slices.every((c) => raw.includes(c))) ok++; else bad.push({ raqm: r.raqm, page_id: r.page_id });
}
console.log(`verbatim: ${ok}/${sample.length} random hadiths found (80-char slices) in raw pages`, bad.length ? bad : "");

// 2. cross-edition
if (cross) {
  const text = [];
  for (let i = 1; i <= 6000; i += 200) text.push(...(await fetchPages(cross, Array.from({ length: 200 }, (_, k) => i + k))).map((p) => p.body ?? ""));
  const flat = text.join("\r").replace(/<[^>]*>/g, "");
  const GEN = new Set(["حدثنا", "ثنا", "نا", "اخبرنا", "انا", "حدثني", "اخبرني", "ناه", "ثني", "ان"]);
  const head = (t) => normalizeArabic(t).split(" ").filter((w) => !GEN.has(w)).slice(0, 10).join(" ");
  const D = "٠١٢٣٤٥٦٧٨٩";
  let agree = 0, disagree = 0, absent = 0; const diffs = [];
  for (const r of rows.filter((x) => x.dup_index === 1)) {
    const ar = String(r.raqm).replace(/\d/g, (d) => D[d]);
    // front-matter prose also contains "N - ": take the first candidate that is vowelled (= hadith text)
    const m = [...flat.matchAll(new RegExp(`(?:^|[\\r\\n.»"])${ar} - ([^\\r]{0,420})`, "g"))].find((x) => (x[1].match(/[ً-ْ]/g) || []).length > 20);
    if (!m) { absent++; continue; }
    // editions differ in collation prefixes ("أخبرنا أبو طاهر…") and footnote anchors: require 60% of our first 10 words in theirs
    const theirs = new Set(normalizeArabic(m[1]).split(" "));
    const ours = head(r.matn_ar.slice(0, 200)).split(" ");
    if (ours.filter((w) => theirs.has(w)).length / ours.length >= 0.6) agree++; else { disagree++; if (diffs.length < 8) diffs.push(r.raqm); }
  }
  console.log(`cross-edition (#${cross}, first 1500 pages only = ~half the book): agree ${agree}, disagree ${disagree}, not-found ${absent}`, diffs);
}
helper.close();
