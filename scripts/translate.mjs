// Terjemah matn hadis → BM + English guna Claude. Resumable (langkau yg dah ada).
// Anggaran: node --env-file=.env.local scripts/translate.mjs --dry-run
// Uji     : node --env-file=.env.local scripts/translate.mjs --lang=ms --limit=5
// Penuh   : node --env-file=.env.local scripts/translate.mjs            (ms+en, semua)
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db";
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const LANGS = !args.lang || args.lang === "both" ? ["ms", "en"] : [String(args.lang)];
const MODEL = String(args.model ?? "claude-haiku-4-5");
const LIMIT = args.limit ? Number(args.limit) : 1e9;
const CONC = Number(args.concurrency ?? 4);
const DRY = !!args.dryRun || !!args["dry-run"];

const LANG_NAME = { ms: "Bahasa Melayu baku", en: "English" };
const system = (lang) =>
  `Anda penterjemah hadis pakar. Terjemah TEKS HADIS Arab (termasuk sanad/isnad) ke ${LANG_NAME[lang]}.
Peraturan:
- Kekalkan makna TEPAT. Jangan tambah tafsiran, komentar, atau nota.
- Guna istilah Islam standard${lang === "ms" ? " dan ejaan rasmi Dewan Bahasa dan Pustaka (DBP)" : ""}.
- "صلى الله عليه وسلم" → ${lang === "ms" ? "“selawat dan salam ke atasnya”" : "“peace be upon him”"}; nama perawi kekal transliterasi.
- Output: TERJEMAHAN SAHAJA.`;

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

if (DRY) {
  for (const lang of LANGS) {
    const rows = await rowsNeeding(lang);
    const chars = rows.reduce((s, r) => s + ((r.matn_ar || "").length), 0);
    const inTok = Math.round(chars / 3) + rows.length * 130; // anggaran kasar
    console.log(`[${lang}] ${rows.length} hadis perlu terjemah · anggaran input ~${inTok.toLocaleString()} tok (output ~sebanding). Model ${MODEL}.`);
  }
  console.log("\n(dry-run — tiada panggilan API. Sahkan harga semasa sebelum run penuh.)");
  db.close();
} else {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ Set ANTHROPIC_API_KEY dalam .env.local dahulu (atau guna --dry-run).");
    process.exit(1);
  }
  const anthropic = new Anthropic();
  for (const lang of LANGS) {
    const rows = await rowsNeeding(lang);
    console.log(`[${lang}] ${rows.length} hadis → terjemah (model ${MODEL}, concurrency ${CONC})`);
    let idx = 0, done = 0, errs = 0;
    const worker = async () => {
      while (idx < rows.length) {
        const r = rows[idx++];
        try {
          const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2000,
            system: system(lang),
            messages: [{ role: "user", content: r.matn_ar }],
          });
          const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
          if (text) {
            await db.execute({
              sql: `INSERT INTO translations (entity_type,entity_id,lang,text,source,model,is_verified,created_at)
                    VALUES ('hadith',?,?,?,'ai',?,0,datetime('now'))
                    ON CONFLICT(entity_type,entity_id,lang,source) DO UPDATE SET text=excluded.text, model=excluded.model`,
              args: [r.id, lang, text, MODEL],
            });
            done++;
          }
          if (done % 10 === 0) process.stdout.write(`\r  [${lang}] ${done}/${rows.length} (ralat ${errs})   `);
        } catch (e) {
          errs++;
          console.error(`\n  ✗ hadis ${r.id} (${lang}): ${e.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));
    console.log(`\n  ✓ [${lang}] siap ${done}, ralat ${errs}`);
  }
  db.close();
}
