// Enjin terjemahan provider-agnostic: matn hadis → BM + English.
// Provider: ollama (lokal — UTAMA) | gemini | groq. Resumable.
//   Anggaran : node --env-file=.env.local scripts/translate.mjs --dry-run
//   Uji      : node --env-file=.env.local scripts/translate.mjs --provider=ollama --model=aya:8b --lang=ms --limit=3
//   Penuh    : node --env-file=.env.local scripts/translate.mjs
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
const VERIFY = !(args.noVerify || args["no-verify"]); // crosscheck AI-ke-AI (lalai ON)

// ── Prompt ketat + few-shot ─────────────────────────────────────────────────
const SYSTEM = {
  ms: `Anda penterjemah hadis pakar Arab→Bahasa Melayu. Terjemah teks hadis (sanad + matan) ke Bahasa Melayu BAKU (ejaan Dewan Bahasa dan Pustaka, Malaysia) — BUKAN Bahasa Indonesia.
PERATURAN KETAT:
1. Output HANYA terjemahan. JANGAN tulis "Terjemahan:", mukadimah, nota, atau komentar.
2. Kekalkan makna TEPAT. Jangan tokok tambah atau tafsir.
3. Sanad guna "menceritakan kepadaku/kami", "daripada"; Nabi → "baginda bersabda"; "صلى الله عليه وسلم" → "SAW".
4. Nama perawi: transliterasi Melayu standard (cth عبد الله → Abdullah, جابر بن زيد → Jabir bin Zaid).
5. Istilah: مؤمن=mukmin (orang beriman), كافر=kafir, نية=niat, عمل=amalan.`,
  en: `You are an expert Arabic→English hadith translator. Translate the hadith text (chain + content) into clear, accurate ENGLISH ONLY.
STRICT RULES:
1. Output ONLY the English translation. NO preamble, "Translation:", notes, or commentary.
2. Preserve the meaning EXACTLY. Do not add interpretation.
3. Chain: "narrated to me/us", "from"; Prophet → "he said"; "صلى الله عليه وسلم" → "(peace be upon him)".
4. Narrator names: standard transliteration (عبد الله → Abdullah, جابر بن زيد → Jabir ibn Zayd).
5. Never output Malay or untranslated Arabic prose — English only.`,
};

const EX_AR =
  'حَدَّثَنِي أَبُو عُبَيْدَةَ ، عَنْ جَابِرِ بْنِ زَيْدٍ ، عَنْ عَبْدِ اللَّهِ بْنِ عَبَّاسٍ ، عَنِ النَّبِيِّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ، قَالَ : " نِيَّةُ الْمُؤْمِنِ خَيْرٌ مِنْ عَمَلِهِ "';
const EX = {
  ms: 'Abu Ubaidah menceritakan kepadaku, daripada Jabir bin Zaid, daripada Abdullah bin Abbas, daripada Nabi SAW, baginda bersabda: "Niat orang mukmin lebih baik daripada amalannya."',
  en: 'Abu Ubaidah narrated to me, from Jabir ibn Zayd, from Abdullah ibn Abbas, from the Prophet (peace be upon him), who said: "The intention of the believer is better than his deed."',
};

function buildMessages(lang, matn) {
  return [
    { role: "system", content: SYSTEM[lang] },
    { role: "user", content: EX_AR },
    { role: "assistant", content: EX[lang] },
    { role: "user", content: matn },
  ];
}

// ── Peringkat verifikasi AI-ke-AI (pengkritik tegas) ────────────────────────
const VERIFY_SYSTEM = {
  ms: `Anda PENYEMAK terjemahan hadis yang TEGAS & TELITI. Diberi teks Arab asal dan terjemahan Bahasa Melayu cadangan, semak ketepatan makna:
- NEGASI: pastikan tidak terbalik (cth فأعي = "aku faham", BUKAN "tidak faham").
- KATA KERJA: pastikan betul (cth علّموا = "ajarkan", BUKAN "pelajari").
- NAMA PERAWI: JANGAN benarkan nama yang direka/ditambah yang tiada dalam teks Arab.
- KELENGKAPAN: jangan ada bahagian tertinggal.
- BAHASA: Melayu baku DBP (bukan Indonesia: guna "loceng" bukan "lonceng", "lelaki" bukan "pria", "kamu" bukan "kalian").
Jika terjemahan TEPAT sepenuhnya, ulang ia sebagaimana adanya. Jika ada SEBARANG kesalahan, output versi BETUL.
Output HANYA terjemahan Bahasa Melayu akhir — tiada komentar, tiada penjelasan.`,
  en: `You are a STRICT, meticulous hadith translation REVIEWER. Given the original Arabic and a proposed English translation, verify meaning accuracy:
- NEGATION: ensure not flipped (e.g. فأعي = "I understand", NOT "I do not understand").
- VERBS: ensure correct (e.g. علّموا = "teach", NOT "learn").
- NARRATOR NAMES: do NOT allow invented/added names absent from the Arabic.
- COMPLETENESS: nothing omitted.
If the translation is fully accurate, repeat it as-is. If there is ANY error, output the corrected version.
Output ONLY the final English translation — no commentary, no explanation.`,
};
function buildVerifyMessages(lang, matn, draft) {
  return [
    { role: "system", content: VERIFY_SYSTEM[lang] },
    { role: "user", content: `ARAB:\n${matn}\n\nTERJEMAHAN:\n${draft}` },
  ];
}

// ── Providers (terima array messages) ───────────────────────────────────────
async function callOllama(messages) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0.2 } }),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  return (await res.json()).message?.content?.trim();
}
async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY tiada");
  const sys = messages.find((m) => m.role === "system")?.content;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents, generationConfig: { temperature: 0.2 } }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`gemini ${j.error?.message || res.status}`);
  return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}
async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY tiada");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`groq ${j.error?.message || res.status}`);
  return j.choices?.[0]?.message?.content?.trim();
}
const CALL = { ollama: callOllama, gemini: callGemini, groq: callGroq }[PROVIDER];
if (!CALL) { console.error(`✗ provider tak dikenali: ${PROVIDER}`); process.exit(1); }

// Buang pendahuluan biasa jika model degil
function clean(text) {
  if (!text) return text;
  return text
    .replace(/^\s*(terjemahan|translation|here is.*?:|berikut.*?:)\s*[:\-]?\s*/i, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();
}

async function rowsNeeding(lang) {
  const r = await db.execute({
    sql: `SELECT h.id, h.matn_ar FROM hadiths h
           WHERE NOT EXISTS (SELECT 1 FROM translations t
             WHERE t.entity_type='hadith' AND t.entity_id=h.id AND t.lang=?)
           LIMIT ?`,
    args: [lang, LIMIT],
  });
  return r.rows;
}

async function healthCheck() {
  if (PROVIDER !== "ollama") return;
  try {
    const j = await (await fetch("http://localhost:11434/api/tags")).json();
    const models = (j.models || []).map((m) => m.name);
    if (!models.some((m) => m.startsWith(MODEL.split(":")[0]))) {
      console.error(`✗ Model '${MODEL}' belum di-pull. Jalankan: ollama pull ${MODEL}`);
      process.exit(1);
    }
  } catch {
    console.error("✗ Ollama tak berjalan di :11434. Buka app Ollama + ollama pull " + MODEL);
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
if (DRY) {
  for (const lang of LANGS) {
    const rows = await rowsNeeding(lang);
    console.log(`[${lang}] ${rows.length} hadis perlu terjemah · provider ${PROVIDER}/${MODEL}`);
  }
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
          let text = clean(await CALL(buildMessages(lang, r.matn_ar)));
          if (text && VERIFY) {
            const checked = clean(await CALL(buildVerifyMessages(lang, r.matn_ar, text)));
            if (checked) text = checked;
          }
          if (text) {
            await db.execute({
              sql: `INSERT INTO translations (entity_type,entity_id,lang,text,source,model,is_verified,created_at)
                    VALUES ('hadith',?,?,?,'ai',?,0,datetime('now'))
                    ON CONFLICT(entity_type,entity_id,lang,source) DO UPDATE SET text=excluded.text, model=excluded.model`,
              args: [r.id, lang, text, `${PROVIDER}:${MODEL}${VERIFY ? "+v" : ""}`],
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
