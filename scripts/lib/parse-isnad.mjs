// Enjin ekstrak isnad v2 — menghormati seni penulisan sanad klasik:
//   • ح  (taḥwīl)  → rantai BERUBAH / cabang baharu (bukan nama perawi)
//   • و  ('aṭf)    → perawi mengambil dari DUA guru (perawi selari pada posisi sama)
//   • sisipan ( - … - , ( … ) , "وهذا حديثه", "واللفظ له" ) → dibuang
//   • kunya، nama  → satu orang (apposition)
// Pulangan: senarai RANTAI (cabang); setiap rantai = senarai POSISI; setiap posisi =
//   senarai nama selari. Cth: [ [ [n1],[n2],[n3] ], [ [m1],[m2] ] ] = 2 cabang.
// Padanan nama ke korpus dibuat di luar (enrich). Heuristik — bukan sempurna.

const TASHKEEL = /[ؐ-ًؚ-ٰٟـ​-‏‪-‮﻿]/g;
const strip = (s) =>
  (s || "")
    .replace(TASHKEEL, "")
    .replace(/[ىي]/g, "ي").replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();

const PROPHET = /(رسول الله|النبي صلي|عن النبي|قال النبي|سمعت رسول|ان رسول|عن رسول|قال قال)/;
const CONNECT = /(?:وحدثنا|وحدثني|واخبرنا|واخبرني|فحدثنا|حدثناه|حدثنا|حدثني|اخبرناه|اخبرنا|اخبرني|انبانا|انباني|ثنا|سمعت|سمع |عن |قال لنا|كتب الي|قرات علي)/g;
const NOISE = /(رضي الله عنهما|رضي الله عنهم|رضي الله عنها|رضي الله عنه|صلي الله عليه وسلم|عليه السلام|رحمه الله|علي المنبر|واللفظ له|واللفظ لـ?\S*|وهذا حديثه|وهذا لفظ\S*|جميعا|كلاهما)/g;
const SPEECH = new Set(["قال", "قالت", "انه", "انها", "انهم", "يقول", "تقول", "ان", "سال", "سالت", "فقال", "وقال", "يحدث", "اخبره", "كان", "حدث"]);

const cleanSeg = (seg) =>
  seg.replace(NOISE, " ").replace(/-[^-]{0,40}-/g, " ").replace(/\([^)]{0,45}\)/g, " ")
     .replace(/[،:؛.,"'()«»\[\]]/g, " ").replace(/\s+/g, " ").trim();

// satu segmen → nama (potong di token percakapan, hadkan panjang)
function toName(seg) {
  let tok = cleanSeg(seg).split(" ").filter(Boolean);
  const cut = tok.findIndex((w) => SPEECH.has(w));
  if (cut === 0) return null;
  if (cut > 0) tok = tok.slice(0, cut);
  const name = tok.join(" ");
  if (name.length < 3 || tok.length > 8) return null;
  return name;
}

// segmen boleh ada perawi SELARI dipisah و: "وكيع وابو معاوية"
function toParallel(seg) {
  // pisah pada ' و' yang diikuti huruf (atf antara nama) — bukan 'و' dalam perkataan
  const parts = seg.split(/\sو(?=[^\s])/).map((p) => toName(p)).filter(Boolean);
  // buang ulang
  return [...new Set(parts)];
}

export function parseIsnadChains(matn) {
  let t = strip(matn);
  if (!t) return [];
  // buang sisipan ( - … - / ( … ) ) + noise DAHULU — sebelum pisah cabang/perawi.
  t = t.replace(/-[^-]{0,45}-/g, " ").replace(/\([^)]{0,50}\)/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
  // potong di matan (anggaran)
  const m = t.search(PROPHET);
  let isnad = m > 0 ? t.slice(0, m) : t.slice(0, Math.min(t.length, 320));

  // cabang pada ح (taḥwīl) — ح terpencil (ruang kedua sisi atau diikuti و)
  const branches = isnad.split(/\sح(?=\s|و)/).map((s) => s.trim()).filter(Boolean);

  const chains = [];
  for (const br of branches) {
    const positions = [];
    const seen = new Set();
    for (let seg of br.split(CONNECT)) {
      seg = seg.trim(); // buang ruang depan → 'و' nama (وكيع) tak tersilap baca 'و' atf
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
  return chains;
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
