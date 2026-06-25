// Parse OCR Kamus Istilah Hadis (data/kamus/ocr/*.txt) → entri glosari.
// OCR berselerak (paragraph mode) — guna corak "TERM_ARAB  Gloss-Melayu:" utk
// ekstrak term + gloss + definisi kasar. ADDITIVE: INSERT OR IGNORE (tak ganti kurasi).
// Fail OCR TIDAK dipadam. Tanda source='kamus-ocr' (boleh diperhalusi LLM kemudian).
//   node scripts/parse-kamus-ocr.mjs --dry            (lihat sahaja)
//   TURSO_SYNC_URL=… TURSO_SYNC_TOKEN=… node scripts/parse-kamus-ocr.mjs   (simpan lokal + Turso)
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { normalizeArabic } from "./lib/arabic.mjs";

const DIR = "data/kamus/ocr";
const DRY = process.argv.includes("--dry");

// Corak: jujukan Arab (2..70 char) + gloss Melayu (3..60) + ':'
const PAT = /([؀-ۿ][؀-ۿ\s]{1,70})\s+([A-Za-z][A-Za-z'’\- ]{2,60}?)\s*[:：]/g;
const ARWORD = /[؀-ۿ]+/g;

const isHadithTerm = (ms) => ms.length >= 4 && ms.length <= 60;
const lastArWords = (s, k = 6) => (s.match(/[؀-ۿ]+/g) || []).slice(-k).join(" ").trim();

const entries = new Map(); // term_search → {term_ar, term_ms, def_ms, huruf}
const files = readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort();
for (const f of files) {
  let txt;
  try { txt = readFileSync(`${DIR}/${f}`, "utf8"); } catch { continue; }
  const matches = [...txt.matchAll(PAT)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const term_ar = lastArWords(m[1]);
    const term_ms = m[2].trim().replace(/\s+/g, " ");
    if (!term_ar || term_ar.length < 3 || !isHadithTerm(term_ms)) continue;
    const key = normalizeArabic(term_ar);
    if (!key || entries.has(key)) continue;
    // definisi kasar = teks selepas ':' hingga padanan seterusnya (atau 700 char)
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : Math.min(txt.length, start + 700);
    const def_ms = txt.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 700);
    const huruf = (key.match(/[؀-ۿ]/) || [""])[0];
    entries.set(key, { term_ar, term_ms, def_ms, huruf, key });
  }
}

console.log(`→ Diekstrak ${entries.size} entri unik dari ${files.length} halaman OCR`);
if (DRY) {
  let n = 0;
  for (const e of entries.values()) { if (n++ >= 25) break; console.log(`  [${e.huruf}] ${e.term_ar}  —  ${e.term_ms}  ::  ${e.def_ms.slice(0, 70)}…`); }
  process.exit(0);
}

// ── Simpan: lokal + (jika kredential) Turso. INSERT OR IGNORE (kekalkan kurasi). ──
async function save(url, authToken, label) {
  const db = createClient({ url, authToken });
  await db.execute("PRAGMA busy_timeout=20000").catch(() => {});
  let added = 0, batch = [];
  const flush = async () => { if (batch.length) { await db.batch(batch, "write"); batch = []; } };
  for (const e of entries.values()) {
    batch.push({
      sql: `INSERT OR IGNORE INTO glossary (term_ar,huruf,term_search,term_ms,def_ms,source)
            VALUES (?,?,?,?,?,'kamus-ocr')`,
      args: [e.term_ar, e.huruf, e.key, e.term_ms, e.def_ms],
    });
    added++;
    if (batch.length >= 200) await flush();
  }
  await flush();
  const n = Number((await db.execute("SELECT COUNT(*) n FROM glossary")).rows[0].n);
  console.log(`✓ ${label}: cuba ${added} (INSERT OR IGNORE) | jumlah glosari kini: ${n}`);
  db.close();
}

await save(process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db", process.env.TURSO_LOCAL_TOKEN, "lokal");
if (process.env.TURSO_SYNC_URL && process.env.TURSO_SYNC_TOKEN) {
  await save(process.env.TURSO_SYNC_URL, process.env.TURSO_SYNC_TOKEN, "Turso");
} else {
  console.log("(TURSO_SYNC_* tiada — Turso dilangkau; jalankan glossary push berasingan)");
}
