// Enjin terjemahan provider-agnostic: matn hadis → BM + English.
// Provider: ollama (lokal, tanpa had — UTAMA) | gemini | groq. Resumable.
//   Anggaran : node --env-file=.env.local scripts/translate.mjs --dry-run
//   Ollama   : node --env-file=.env.local scripts/translate.mjs --provider=ollama --model=aya:8b
//   Gemini   : node --env-file=.env.local scripts/translate.mjs --provider=gemini --limit=20
//   Penuh    : node --env-file=.env.local scripts/translate.mjs            (ms+en, ollama)
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const LANGS = !args.lang || args.lang === "both" ? ["ms", "en"] : [String(args.lang)];
const PROVIDER = String(args.provider ?? "ollama");
const DEFAULT_MODEL = { ollama: "aya:8b", gemini: "gemini-2.0-flash", groq: "llama-3.3-70b-versatile" };
const MODEL = String(args.model ?? DEFAULT_MODEL[PROVIDER] ?? "aya:8b");
const LIMIT = args.limit ? Number(args.limit) : 1e9;
const CONC = Number(args.concurrency ?? (PROVIDER === "ollama" ? 2 : 4));
const DRY = !!args.dryRun || !!args["dry-run"];

const LANG_NAME = { ms: "Bahasa Melayu baku", en: "English" };

// Hook glosari: kelak diisi dari Kamus Istilah Hadis (istilah_ar → istilah_ms).
function glossaryHint(/* lang */) {
  return ""; // TODO: suntik istilah teknikal dari glosari kamus
}

const system = (lang) =>
  `Anda penterjemah hadis pakar. Terjemah TEKS HADIS Arab (termasuk sanad/isnad) ke ${LANG_NAME[lang]}.
Peraturan:
- Kekalkan makna TEPAT. Jangan tambah tafsiran, komentar, atau nota.
- Guna istilah Islam standard${lang === "ms" ? " dan ejaan rasmi Dewan Bahasa dan Pustaka (DBP)" : ""}.
- "صلى الله عليه وسلم" → ${lang === "ms" ? "“selawat dan salam ke atasnya”" : "“peace be upon him”"}; nama perawi kekal transliterasi.
- Output: TERJEMAHAN SAHAJA, tiada teks lain.${glossaryHint(lang)}`;

// ── Providers ──────────────────────────────────────────────────────────────
async function callOllama(sys, user) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: sys }, { role: "user", content: user }], stream: false }),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  return (await res.json()).message?.content?.trim();
}
async function callGemini(sys, user) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY tiada");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: user }] }] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`gemini ${j.error?.message || res.status}`);
  return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}
async function callGroq(sys, user) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY tiada");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`groq ${j.error?.message || res.status}`);
  return j.choices?.[0]?.message?.content?.trim();
}
const CALL = { ollama: callOllama, gemini: callGemini, groq: callGroq }[PROVIDER];
if (!CALL) { console.error(`✗ provider tak dikenali: ${PROVIDER}`); process.exit(1); }

async function rowsNeeding(lang) {
  const r = await db.execute({
    sql: `SELECT h.id, h.matn_ar FROM hadiths h
           WHERE NOT EXISTS (SELECT 1 FROM translations t
             WHERE t.entity_type='hadith' AND t.entity_id=h.id AND t.lang=? AND t.source='ai')
           LIMIT ?`,
    args: [lang, LIMIT],
  });
  return r.rows;
}

async function healthCheck() {
  if (PROVIDER !== "ollama") return;
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    const j = await res.json();
    const models = (j.models || []).map((m) => m.name);
    if (!models.some((m) => m.startsWith(MODEL.split(":")[0]))) {
      console.error(`✗ Model '${MODEL}' belum di-pull. Jalankan: ollama pull ${MODEL}`);
      console.error(`  Model sedia ada: ${models.join(", ") || "(tiada)"}`);
      process.exit(1);
    }
  } catch {
    console.error("✗ Ollama tak berjalan di localhost:11434. Pasang & jalankan Ollama (ollama.com), kemudian: ollama pull " + MODEL);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
if (DRY) {
  for (const lang of LANGS) {
    const rows = await rowsNeeding(lang);
    const chars = rows.reduce((s, r) => s + ((r.matn_ar || "").length), 0);
    console.log(`[${lang}] ${rows.length} hadis perlu terjemah · ~${Math.round(chars / 3).toLocaleString()} tok input · provider ${PROVIDER}/${MODEL}`);
  }
  console.log("\n(dry-run — tiada panggilan.)");
  db.close();
} else {
  await healthCheck();
  for (const lang of LANGS) {
    const rows = await rowsNeeding(lang);
    console.log(`[${lang}] ${rows.length} hadis → ${PROVIDER}/${MODEL} (concurrency ${CONC})`);
    let idx = 0, done = 0, errs = 0;
    const worker = async () => {
      while (idx < rows.length) {
        const r = rows[idx++];
        try {
          const text = await CALL(system(lang), r.matn_ar);
          if (text) {
            await db.execute({
              sql: `INSERT INTO translations (entity_type,entity_id,lang,text,source,model,is_verified,created_at)
                    VALUES ('hadith',?,?,?,'ai',?,0,datetime('now'))
                    ON CONFLICT(entity_type,entity_id,lang,source) DO UPDATE SET text=excluded.text, model=excluded.model`,
              args: [r.id, lang, text, `${PROVIDER}:${MODEL}`],
            });
            done++;
          }
          if (done % 5 === 0) process.stdout.write(`\r  [${lang}] ${done}/${rows.length} (ralat ${errs})   `);
        } catch (e) {
          errs++;
          if (errs <= 3) console.error(`\n  ✗ hadis ${r.id}: ${e.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));
    console.log(`\n  ✓ [${lang}] siap ${done}, ralat ${errs}`);
  }
  db.close();
}
