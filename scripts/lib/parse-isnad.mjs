// Enjin ekstrak isnad v3 (build-time) — PORT SETIA src/lib/parse-isnad.ts.
// Ubah logik? Ubah DUA-DUA fail serentak (satu runtime TS, satu build JS).
//   • ح (taḥwīl) → cabang · و ('aṭf) → perawi selari (hormati waw dalam nama)
//   • verba sanad (حدثنا/أخبرنا/عن/سمعت/قال…) → pemisah posisi
//   • يعني/هو ابن → penjelas nama SAMA · أبيه/جدّه/جدّي → perawi (relational)
//   • buang: tashkeel, honorifik/doa, nota riwayat, TARIKH & ANGKA, isyarat
//     (أومأ بيده), sisipan ( - … - ), dialog/matn
//   • marfū' → Nabi ﷺ akar; mawqūf/maqṭūʿ → JANGAN letak Nabi
// parseIsnadFull → { chains, marfu } · parseIsnadChains → chains (serasi lama)

const TASHKEEL = /[ؐ-ؚـً-ٰٟۖ-ۭ​-‏‪-‮﻿]/g;
export const strip = (s) =>
  (s || "")
    .replace(TASHKEEL, "")
    .replace(/[ىي]/g, "ي").replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

// Susunan alternation PENTING: bentuk ber-ه (وحدثناه/سمعته) MESTI sebelum bentuk
// pendek; "ان " juga penghubung. كلاهما/جميعا BUKAN NOISE — penanda CANTUM tahwil.
const CONNECT = /(?:وحدثناه|وحدثنا|وحدثني|واخبرناه|واخبرنا|واخبرني|فحدثناه|فحدثنا|فحدثني|حدثناه|حدثنا|حدثني|حدثهم|حدثه|اخبرناه|اخبرنا|اخبرني|اخبرهم|انبانا|انباني|ثنا|انا |ان |سمعته|سمعت|سمع |عن |قال لنا|قال لي|كتب الي|قرات علي|قري علي|روي عن|رواه عن|قالوا|قالا|قالت|قال)/g;
const NOISE = /(رضي الله عنهما|رضي الله عنهم|رضي الله عنها|رضي الله عنه|رضي الله عنهن|صلي الله عليه وسلم|صلي الله عليه واله|عليه السلام|عليه الصلاه والسلام|رحمه الله|رحمهم الله|تعالي|عز وجل|تبارك وتعالي|علي المنبر|واللفظ لهما|واللفظ له|واللفظ لـ?\S*|هذا لفظ\S*|وهذا حديثه|وهذا لفظ\S*|واللفظ|زاد فيه|زاد)/g;

const STOP = new Set([
  "قال", "قالت", "قالوا", "قالا", "انه", "انها", "انهم", "يقول", "تقول", "يقولون", "ان", "سال", "سالت",
  "فقال", "وقال", "فقالت", "يحدث", "تحدث", "اخبره", "اخبرها", "كان", "كانت", "حدث", "حدثت",
  "يخطب", "خطب", "يخطبه", "سمعته", "سمعتها", "رايت", "رايته", "رات", "دخلت", "اتيت", "جاء", "جاءت",
  "وهو", "وهي", "فلما", "لما", "بينما", "بينا", "اذ", "اذا", "فاذا", "حين", "حتي", "ثم", "فذكر", "يذكر", "ذكر",
  "نحو", "نحوه", "مثل", "بمثله", "قلت", "قلنا", "كنا", "كنت",
  "كلاهما", "كليهما", "كلهم", "جميعا", "ثلاثتهم", "اربعتهم", "خمستهم", "ستتهم",
  "اوما", "فاوما", "يومي", "اشار", "فاشار", "يشير", "بيده",
  "بنحوه", "بهذا", "بهذه", "يا", "يعني", "يعنى", "لفظه", "معناه", "قصته", "الحديث", "فذكره", "بمعناه",
  "قراءه", "سماعا", "املاء", "اجازه", "اذنا", "مناوله", "قدم", "وفد", "المعروف", "يعرف", "بلده",
  "فيما", "اذن", "مكاتبه", "قدمها",
  "سنه", "عام", "شهر", "صفر", "محرم", "ربيع", "جمادي", "رجب", "شعبان", "رمضان", "شوال", "القعده", "الحجه",
]);
const NUM = /^و?(واحد|احدي|اثنتين|اثنين|ثنتين|ثلاث|اربع|خمس|ست|سبع|ثمان|ثماني|تسع|عشر|عشره|بضع|نيف|عشرين|عشرون|ثلاثين|ثلاثون|اربعين|اربعون|خمسين|خمسون|ستين|ستون|سبعين|سبعون|ثمانين|ثمانون|تسعين|تسعون|مايه|ميه|مايتين|ميتين|ثلاثمايه|ثلاثميه|اربعمايه|اربعميه|خمسمايه|خمسميه|ستمايه|ستميه|سبعمايه|سبعميه|ثمانمايه|ثمانميه|تسعمايه|تسعميه|الف|الفين|اثنتي|احدي)$/;

const NASAB_BEFORE = new Set(["بن", "ابن", "ابي", "ابو", "ابا", "عبد", "عبيد", "ام", "ذو", "ذي", "ال", "الي", "عن"]);
const WAW_NAMES = new Set([
  "وقاص", "وائل", "وهب", "وهيب", "واقد", "وكيع", "ورقاء", "وليد", "واصل", "وبره", "وحشي",
  "واثله", "وابصه", "واسع", "وردان", "وهبان", "وداعه", "ورقه", "واقم", "وقدان", "وضاح", "ورد",
  "وازع", "واقدي", "وثيمه", "ودان", "وهابه", "وراد", "ورقان", "واقف", "واصله", "وشيك",
]);

const cleanSeg = (seg) =>
  seg.replace(NOISE, " ").replace(/-[^-]{0,60}-/g, " ").replace(/\([^)]{0,60}\)/g, " ")
     .replace(/(?:يعني|يعنى|وهو|هو) ابن /g, " بن ")
     .replace(/[،:؛.,"'()«»\[\]]/g, " ").replace(/\s+/g, " ").trim();

function toName(seg) {
  let tok = cleanSeg(seg).split(" ").filter(Boolean);
  tok = tok.filter((w) => w !== "يعني" && w !== "يعنى");
  const cut = tok.findIndex((w) => STOP.has(w) || NUM.test(w));
  if (cut === 0) return null;
  if (cut > 0) tok = tok.slice(0, cut);
  if (!tok.length) return null;
  tok = tok.map((w, i) => (i > 0 && w === "ابن" ? "بن" : w));
  const name = tok.join(" ").trim();
  if (name.length < 3 || tok.length > 16) return null;
  return name;
}

export const cleanName = (s) => toName(strip(s)) ?? strip(s);

function toParallel(seg) {
  const words = cleanSeg(seg).split(" ").filter(Boolean);
  const groups = [[]];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = i > 0 ? words[i - 1] : "";
    const startsWaw = w.length > 1 && w[0] === "و";
    const isAtf =
      i > 0 && startsWaw && !NASAB_BEFORE.has(prev) && !WAW_NAMES.has(w) &&
      groups[groups.length - 1].length > 0;
    if (isAtf) groups.push([w.slice(1)]);
    else groups[groups.length - 1].push(w);
  }
  return [...new Set(groups.map((g) => toName(g.join(" "))).filter(Boolean))];
}

export function parseIsnadFull(matn) {
  let t = strip(matn);
  if (!t) return { chains: [], marfu: false };
  // (ح) / [ح] / ح، — tahwil JUGA walau berkurungan/bertanda
  t = t.replace(/[([]\s*ح\s*[)\]]/g, " ح ").replace(/\sح[،:.]/g, " ح ");
  t = t.replace(/-[^-]{0,60}-/g, " ").replace(/\([^)]{0,60}\)/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/(?<![ء-ي])(ابيه|ابيها|جده|جدها|جدي|جدتي|جدته|امه|امها|امي|عمه|عمها|عمي|خاله|خالها|خالي|ابنه|ابنته)(?![ء-ي])/g, " عن $1 ");

  const MARFU = /النبي|رسول الله|رسول اللـه/;
  const marfu = MARFU.test(t);
  const mm = t.search(MARFU);
  const isnad = mm > 0 ? t.slice(0, mm) : (marfu ? "" : t); // tiada had panjang

  const branches = isnad.split(/\sح(?=\s|و)/).map((s) => s.trim()).filter(Boolean);
  // كلاهما/كلهم/جميعا… selepas cabang tahwil TERAKHIR = ekor DIKONGSI semua cabang
  const JOIN = /(?:^|\s)(?:كلاهما|كليهما|كلهم|جميعا|ثلاثتهم|اربعتهم|خمستهم|ستتهم)(?=\s|$)/;
  let shared = "";
  if (branches.length > 1) {
    const m = branches[branches.length - 1].match(JOIN);
    if (m && m.index != null) shared = branches[branches.length - 1].slice(m.index + m[0].length).trim();
  }
  const chains = [];
  for (let bi = 0; bi < branches.length; bi++) {
    const br = bi < branches.length - 1 && shared ? branches[bi] + " " + shared : branches[bi];
    const positions = [];
    const seen = new Set();
    for (let seg of br.split(CONNECT)) {
      seg = seg.trim();
      if (!seg) continue;
      const names = toParallel(seg);
      if (!names.length) continue;
      const key = names.join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      positions.push(names);
    }
    if (positions.length) chains.push(positions);
  }
  return { chains, marfu };
}

// Serasi lama: pulang chains SAHAJA (enrich-hadith.mjs dll).
export function parseIsnadChains(matn) {
  return parseIsnadFull(matn).chains;
}

// Versi rata (relik lama): satu senarai nama (cabang pertama, perawi pertama tiap posisi).
export function parseIsnad(matn) {
  const chains = parseIsnadChains(matn);
  if (!chains.length) return [];
  const out = [], seen = new Set();
  for (const ch of chains) for (const pos of ch) for (const n of pos) {
    if (!seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}
