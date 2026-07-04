// Parser hasil carian dorar (dorar_api.json) → jadual hadith_ruling (lokal).
// AMANAH: setiap blok = hukm SATU muhaddith atas SATU jalur (rawi+kitab) — simpan
// SEMUA dgn atribusi penuh (pelihara kepelbagaian sanad; jangan runtuh jadi 1 gred).
// Tanda is_primary bila المصدر = kitab hadis KITA (hukm muktamad utk hadis itu).
// Input: fail JSON yg disimpan dari pelayar (respons dorar_api.json). Tiada akses rangkaian.
//   node scripts/parse-dorar.mjs <hadith_id> <our_book_ar> <fail.json> [--write]
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const [hadithId, ourBook, file] = process.argv.slice(2);
const WRITE = process.argv.includes("--write");
if (!hadithId || !ourBook || !file) { console.error("guna: node scripts/parse-dorar.mjs <hadith_id> <kitab_ar> <fail.json> [--write]"); process.exit(1); }

const raw = readFileSync(file, "utf8");
// ambil ahadith.result (HTML) — fail boleh JSON penuh atau HTML terus
let html = raw;
try { const j = JSON.parse(raw); html = j?.ahadith?.result ?? raw; } catch { /* HTML terus */ }
html = html.replace(/\\\//g, "/").replace(/\\n/g, "\n").replace(/\\"/g, '"');

const strip = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const field = (block, label) => {
  const re = new RegExp(`<span class="info-subtitle">${label}:<\\/span>([\\s\\S]*?)(?=<span class="info-subtitle">|<\\/div>)`, "");
  const m = block.match(re);
  return m ? strip(m[1]).replace(/^\[|\]$/g, "") : null;
};

const blocks = html.split("--------------").filter((b) => b.includes("hadith-info"));
const norm = (s) => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[آأإ]/g, "ا").replace(/ة/g, "ه").replace(/[«»""\[\]]/g, "").replace(/\s+/g, " ").trim();
const ourNorm = norm(ourBook);

const rulings = [];
blocks.forEach((b, i) => {
  const rawi = field(b, "الراوي");
  const muhaddith = field(b, "المحدث");
  const source_book = field(b, "المصدر");
  const ref = field(b, "الصفحة أو الرقم");
  const hukm = field(b, "خلاصة حكم المحدث");
  if (!muhaddith && !source_book) return;
  const is_primary = source_book && norm(source_book) === ourNorm ? 1 : 0;
  rulings.push({ rawi, muhaddith, source_book, ref, hukm, is_primary, ord: i + 1 });
});

console.log(`hadis #${hadithId} · kitab "${ourBook}" · ${rulings.length} hukm dorar:`);
for (const r of rulings) console.log(`  ${r.is_primary ? "★" : " "} [${r.rawi ?? "-"}] ${r.muhaddith} — ${r.source_book} ${r.ref ?? ""} → ${r.hukm ?? "(takhrij)"}`);
const prim = rulings.filter((r) => r.is_primary);
console.log(`\n primer (المصدر = kitab kita): ${prim.length}${prim.length ? " → hukm: " + prim.map((p) => p.hukm).join(" | ") : " (tiada dlm halaman ini — perlu query lebih tepat)"}`);

if (!WRITE) { console.log("\n(DRY — --write utk simpan)"); process.exit(0); }
const db = createClient({ url: "file:./data/corpus.db" });
for (const r of rulings) {
  await db.execute({
    sql: `INSERT OR IGNORE INTO hadith_ruling (hadith_id,rawi,muhaddith,source_book,ref,hukm,is_primary,ord,fetched_at)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [Number(hadithId), r.rawi, r.muhaddith, r.source_book, r.ref, r.hukm, r.is_primary, r.ord, new Date().toISOString()],
  });
}
console.log(`✓ ${rulings.length} hukm disimpan (LOKAL) utk hadis #${hadithId}.`);
db.close();
