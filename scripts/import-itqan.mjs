// Import korpus perawi Itqan (R3GENESI5/Itqan, 114k profil, 22 kitab rijal klasik)
// → format jsonl korpus kita. Padanan identiti BERASASKAN BUKTI (ilmu rijal):
// senama ≠ semestinya sama orang. Gabung hanya bila disahkan; jika ragu, kekal asing.
//   node scripts/import-itqan.mjs
// Output:
//   data/itqan/narrators.itqan.jsonl  — perawi BAHARU (id = 2_000_000 + itqan_id)
//   data/itqan/grades.itqan.jsonl     — gred tambahan utk perawi islam-db yg DISAHKAN sama
//   data/itqan/enrich.itqan.jsonl     — medan tambahan (wafat/kota) utk perawi islam-db (isi kosong)
//   data/itqan/relations.itqan.jsonl  — tepi guru/murid TEPAT (id), merentas kedua sumber
import { readFileSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { normalizeArabic } from "./lib/arabic.mjs";

const OFFSET = 2_000_000;
const RIJAL = "data/itqan/rijal";
const GRADES = ["reliable", "mostly_reliable", "weak", "unknown", "companion", "fabricator"];

const SRC_LABEL = {
  taqrib: "تقريب التهذيب (ابن حجر)", tahdhib_kamal: "تهذيب الكمال (المزّي)",
  tahdhib_tahdhib: "تهذيب التهذيب (ابن حجر)", mizan: "ميزان الاعتدال (الذهبي)",
  lisan_mizan: "لسان الميزان (ابن حجر)", thiqat: "الثقات (ابن حبان)",
  kashif: "الكاشف (الذهبي)", jarh: "الجرح والتعديل (ابن أبي حاتم)",
  kamil: "الكامل في الضعفاء (ابن عدي)", siyar: "سير أعلام النبلاء (الذهبي)",
  isaba: "الإصابة (ابن حجر)", tarikh_islam: "تاريخ الإسلام (الذهبي)",
  tabaqat: "الطبقات الكبرى (ابن سعد)", mughni_ducafa: "المغني في الضعفاء (الذهبي)",
  diwan_ducafa: "ديوان الضعفاء (الذهبي)", dhayl_diwan: "ذيل ديوان الضعفاء",
  durar_kamina: "الدرر الكامنة (ابن حجر)", tadhkirat_huffaz: "تذكرة الحفاظ (الذهبي)",
  mucin_tabaqat: "معين الطبقات", macrifa_qurra: "معرفة القراء الكبار (الذهبي)",
  tarikh: "التاريخ الكبير (البخاري)", mucjam_shuyukh: "معجم الشيوخ",
};
const GRADE_AR = {
  reliable: "ثقة", mostly_reliable: "صدوق", weak: "ضعيف", unknown: "مجهول الحال",
  companion: "صحابي", fabricator: "كذّاب وضّاع", abandoned: "متروك", liar: "كذّاب",
};
const clean = (v) => (v && v !== "-" && String(v).trim() ? String(v).trim() : null);
const gradeAr = (ar, en) => clean(ar) || GRADE_AR[en] || clean(en);
const parseYear = (death) => { const m = clean(death)?.match(/(\d{1,4})\s*ه/); return m ? Number(m[1]) : null; };
// kunya bersih: ambil "أبو/أم X" (2 token pertama) — buang sampah parsing ("عن"/"له").
const kunyaKey = (k) => { const c = clean(k); if (!c) return null; return normalizeArabic(c.split(/\s+/).slice(0, 2).join(" ")); };

// ── 1. Muat profil Itqan ────────────────────────────────────────────────────
console.log("→ Muat profil Itqan…");
const byId = new Map();
for (const g of GRADES) {
  const d = JSON.parse(readFileSync(`${RIJAL}/profiles_${g}.json`, "utf8"));
  for (const n of Object.values(d)) byId.set(n.id, n);
}
console.log(`  ${byId.size} profil`);

// ── 2. Muat perawi islam-db DGN MEDAN (utk bukti identiti) ──────────────────
console.log("→ Muat perawi islam-db (nama+wafat+kunya)…");
const nameToNarr = new Map(); // norm name → [{id, death, kunya}]
async function loadIslam(file) {
  if (!existsSync(file)) return;
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim(); if (!t) continue;
    let n; try { n = JSON.parse(t); } catch { continue; }
    const k = normalizeArabic(n.name_ar || ""); if (!k) continue;
    (nameToNarr.get(k) ?? nameToNarr.set(k, []).get(k)).push({ id: Number(n.id), death: n.death_year ?? null, kunya: kunyaKey(n.kunya) });
  }
}
await loadIslam("data/islamdb/narrators.jsonl");
await loadIslam("data/islamdb/narrators.recovered.jsonl");
console.log(`  ${nameToNarr.size} nama unik islam-db`);

// ── 3. Padanan identiti berasaskan bukti ────────────────────────────────────
// Pulang perawi islam-db yg DISAHKAN sama, atau null (kekal asing).
function matchIslam(p) {
  const pdeath = parseYear(p.death);
  const pkunya = kunyaKey(p.kunya);
  // calon nama: full_name + namings "penuh" (≥3 token + بن)
  const cand = [p.full_name, ...(p.namings || []).filter((nm) => nm !== p.full_name && nm.split(/\s+/).length >= 3 && nm.includes("بن"))];
  for (const nm of cand) {
    const norm = normalizeArabic(nm);
    const list = nameToNarr.get(norm);
    if (!list || list.length !== 1) continue; // mesti unik di islam-db (elak salah pilih)
    const isl = list[0];
    // PERCANGGAHAN wafat (>5 thn) → orang berbeza, JANGAN gabung
    if (pdeath && isl.death && Math.abs(pdeath - isl.death) > 5) continue;
    const toks = norm.split(/\s+/);
    const isKunyaOnly = /^(ابو|ام)\b/.test(norm) && toks.length <= 3;
    if (isKunyaOnly) continue; // kunya dikongsi ramai → jangan gabung
    if (toks.length < 3) continue; // nama terlalu ringkas → ragu
    const deathAgree = pdeath && isl.death && Math.abs(pdeath - isl.death) <= 2;
    const kunyaAgree = pkunya && isl.kunya && pkunya === isl.kunya;
    const distinctive = toks.length >= 4 && nm.includes("بن"); // nasab panjang = jarang dikongsi
    const noKunyaConflict = !(pkunya && isl.kunya) || kunyaAgree;
    // Gabung jika: wafat setuju, ATAU nama penuh distinctive tanpa percanggahan kunya
    if (deathAgree || (distinctive && noKunyaConflict) || (kunyaAgree && nm.includes("بن"))) return isl;
  }
  return null;
}

// ── 4. Jana output ──────────────────────────────────────────────────────────
console.log("→ Padanan + jana (berhati-hati)…");
const finalMemo = new Map();
const finalId = (itqanId) => {
  if (finalMemo.has(itqanId)) return finalMemo.get(itqanId);
  const p = byId.get(itqanId);
  const m = p ? matchIslam(p) : null;
  const v = (m ? m.id : OFFSET + itqanId);
  finalMemo.set(itqanId, v);
  return v;
};

const narrators = [], gradesEnrich = [], fieldEnrich = [];
let nNew = 0, nMatch = 0;
for (const p of byId.values()) {
  const grades = [];
  for (const [key, s] of Object.entries(p.classical_sources || {})) {
    const verdict = gradeAr(s.grade_ar, s.grade_en);
    if (verdict) grades.push({ scholar: SRC_LABEL[key] || key, verdict });
  }
  if (clean(p.dhahabi)) grades.push({ scholar: "حكم الذهبي", verdict: clean(p.dhahabi) });

  const isl = matchIslam(p);
  if (isl) {
    nMatch++;
    for (const g of grades) gradesEnrich.push({ narrator_id: isl.id, ...g });
    // perkaya medan kosong islam-db
    const dy = parseYear(p.death), city = clean(p.city);
    if (dy || city) fieldEnrich.push({ id: isl.id, death_year: dy, death_place: city, regions: city });
  } else {
    const kunya = clean(p.kunya), nasab = clean(p.nasab), laqab = clean(p.laqab);
    const bio = [p.full_name, kunya, nasab].filter(Boolean).join("، ")
      + (clean(p.grade_ar) ? `. ${clean(p.grade_ar)}` : "")
      + (clean(p.death) ? `. توفي سنة ${clean(p.death)}` : "")
      + (clean(p.city) ? ` بـ${clean(p.city)}` : "") + ".";
    narrators.push({
      id: OFFSET + p.id, name_ar: p.full_name, kunya, nisba: nasab, shuhra: laqab,
      rutbah: gradeAr(p.grade_ar, p.grade_en), profession: null,
      regions: clean(p.city), mawla: null, death_year: parseYear(p.death),
      death_place: clean(p.city), bio_ar: bio, grades,
    });
    nNew++;
  }
}

// tepi guru/murid TEPAT (id)
const edges = new Set();
for (const p of byId.values()) {
  const self = finalId(p.id);
  for (const t of p.teachers || []) if (byId.has(t)) edges.add(`${finalId(t)}\t${self}`);
  for (const s of p.students || []) if (byId.has(s)) edges.add(`${self}\t${finalId(s)}`);
}

writeFileSync("data/itqan/narrators.itqan.jsonl", narrators.map((n) => JSON.stringify(n)).join("\n") + "\n");
writeFileSync("data/itqan/grades.itqan.jsonl", gradesEnrich.map((g) => JSON.stringify(g)).join("\n") + "\n");
writeFileSync("data/itqan/enrich.itqan.jsonl", fieldEnrich.map((g) => JSON.stringify(g)).join("\n") + "\n");
writeFileSync("data/itqan/relations.itqan.jsonl",
  [...edges].map((e) => { const [t, s] = e.split("\t"); return JSON.stringify({ teacher_id: Number(t), student_id: Number(s) }); }).join("\n") + "\n");

console.log(`✓ Perawi BAHARU (kekal asing): ${nNew} | DISAHKAN sama (perkaya): ${nMatch}`);
console.log(`✓ Gred perkaya: ${gradesEnrich.length} | medan perkaya: ${fieldEnrich.length} | tepi: ${edges.size}`);
