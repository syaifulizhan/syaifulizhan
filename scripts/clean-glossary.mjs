// AI-clean entri OCR Kamus Istilah Hadis (al-Ghouri) → entri glosari bersih.
// OCR berselerak → model betulkan istilah Arab (standard) + susun semula def Melayu
// (TANPA tokok maklumat). Entri jelas tetap dibersihkan ringan. INSERT OR IGNORE.
//   node --env-file=.env.local scripts/clean-glossary.mjs --provider=groq --limit=3 --dry
import { readFileSync, readdirSync, appendFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { normalizeArabic } from "./lib/arabic.mjs";

const DIR = "data/kamus/ocr";
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const PROVIDER = String(args.provider ?? "groq");
const MODEL = String(args.model ?? (PROVIDER === "groq" ? "llama-3.3-70b-versatile" : "qwen2.5:14b"));
const LIMIT = args.limit ? Number(args.limit) : 1e9;
const DRY = !!args.dry;
const CONC = Number(args.concurrency ?? (PROVIDER === "groq" ? 2 : 2));

// ── Ekstrak entri mentah dari OCR (corak: TERM_ARAB Gloss-Melayu: def) ──
const PAT = /([؀-ۿ][؀-ۿ\s]{1,70})\s+([A-Za-z][A-Za-z'’\- ]{2,60}?)\s*[:：]/g;
const lastAr = (s) => (s.match(/[؀-ۿ]+/g) || []).slice(-6).join(" ").trim();
const raw = new Map();
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".txt")).sort()) {
  let txt; try { txt = readFileSync(`${DIR}/${f}`, "utf8"); } catch { continue; }
  const ms = [...txt.matchAll(PAT)];
  for (let i = 0; i < ms.length; i++) {
    const term = lastAr(ms[i][1]); const gloss = ms[i][2].trim();
    if (!term || term.length < 3 || gloss.length < 4) continue;
    const key = normalizeArabic(term); if (!key || raw.has(key)) continue;
    const start = ms[i].index + ms[i][0].length;
    const end = i + 1 < ms.length ? ms[i + 1].index : Math.min(txt.length, start + 600);
    raw.set(key, { term, gloss, def: txt.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 600) });
  }
}
console.log(`→ ${raw.size} entri OCR mentah`);

// Tulis ke corpus.db tempatan (BUKAN Turso — kuota habis; glosari pindah ke D1).
const db = createClient({ url: "file:./data/corpus.db" });
await db.execute("PRAGMA busy_timeout=20000").catch(() => {});
// Kekal semua yang dah ada (curated + Groq berkualiti); dedup istilah AI-clean kolaps.
const existing = new Set(
  (await db.execute("SELECT term_search FROM glossary")).rows.map((r) => r.term_search)
);
// Resume-log: kunci raw yang dah diproses (elak ulang bila grind disambung).
const DONELOG = "data/kamus/cleaned.keys";
const doneKeys = new Set(existsSync(DONELOG) ? readFileSync(DONELOG, "utf8").split("\n").filter(Boolean) : []);
const fresh = [...raw.entries()].filter(([k]) => !existing.has(k) && !doneKeys.has(k));
const todo = fresh.slice(0, LIMIT);
console.log(`→ ${fresh.length} perlu di-clean (langkau ${raw.size - fresh.length} curated)${LIMIT < 1e9 ? ` — proses ${todo.length}` : ""}`);

const SYS = `Anda penyunting pakar Kamus Istilah Hadis (ulum al-hadith). Diberi hasil OCR BERSELERAK bagi satu entri kamus, pulangkan JSON BERSIH sahaja:
{"term_ar":"istilah Arab BETUL (baiki ralat OCR; istilah standard mustalah)","translit":"transliterasi rumi","term_ms":"makna ringkas Melayu baku","def_ms":"definisi Melayu disusun semula dari teks OCR","ok":true/false}
PERATURAN:
- Baiki ejaan Arab yang rosak kepada istilah standard yang betul (cth OCR 'الإننام' → 'الإبهام').
- def_ms: SUSUN SEMULA ayat dari teks OCR jadi koheren; JANGAN tokok maklumat baharu.
- Bahasa Melayu BAKU (DBP), bukan Indonesia.
- "ok": false jika OCR terlalu rosak sehingga kamu tak yakin istilah sebenar.
- Output JSON SAHAJA, tiada teks lain.`;

async function call(messages) {
  if (PROVIDER === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.1, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(40000),
    });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 8000)); throw new Error("429"); }
    const j = await res.json(); if (!res.ok) throw new Error(j.error?.message || res.status);
    return j.choices?.[0]?.message?.content;
  }
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, format: "json", options: { temperature: 0.1 } }),
  });
  return (await res.json()).message?.content;
}

let done = 0, ok = 0, flagged = 0, errs = 0;
let idx = 0;
const worker = async () => {
  while (idx < todo.length) {
    const [key, e] = todo[idx++];
    const user = `OCR (berselerak):\nIstilah: ${e.term}\nMakna: ${e.gloss}\nDefinisi: ${e.def}`;
    try {
      const out = await call([{ role: "system", content: SYS }, { role: "user", content: user }]);
      const j = JSON.parse(out);
      if (!j.term_ar) { errs++; continue; }
      if (!DRY) appendFileSync(DONELOG, key + "\n"); // tanda raw ini selesai (resume)
      const ckey = normalizeArabic(j.term_ar);
      if (existing.has(ckey)) { done++; continue; } // kolaps ke istilah sedia ada
      existing.add(ckey);
      if (j.ok === false) flagged++; else ok++;
      const huruf = (ckey.match(/[؀-ۿ]/) || [""])[0];
      if (DRY) {
        console.log(`\n[${huruf}] ${e.term} → ${j.term_ar} (${j.translit}) | ${j.term_ms}${j.ok === false ? " ⚠FLAG" : ""}`);
        console.log(`   def: ${(j.def_ms || "").slice(0, 90)}…`);
      } else {
        await db.execute({
          sql: `INSERT OR IGNORE INTO glossary (term_ar,huruf,term_search,translit,term_ms,def_ms,source)
                VALUES (?,?,?,?,?,?,?)`,
          args: [j.term_ar, huruf, normalizeArabic(j.term_ar), j.translit ?? null, j.term_ms ?? null, j.def_ms ?? null, j.ok === false ? "kamus-ai-flag" : "kamus-ai"],
        });
      }
      done++;
      if (!DRY && done % 25 === 0) process.stdout.write(`\r  ${done}/${todo.length} (ok ${ok}, flag ${flagged}, ralat ${errs})   `);
    } catch (err) { errs++; if (errs <= 3) console.error(`\n  ✗ ${e.term}: ${err.message}`); if (String(err.message).includes("429")) idx--; }
  }
};
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`\n✓ Siap: ${done} di-clean (ok ${ok}, flag-perlu-semak ${flagged}, ralat ${errs})`);
db.close();
