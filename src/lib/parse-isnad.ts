// Enjin ekstrak isnad v3 (runtime) — hormati disiplin ilmu isnad:
//   • ح (taḥwīl) → cabang · و ('aṭf) → perawi selari (hormati waw dalam nama)
//   • verba sanad (حدثنا/أخبرنا/عن/سمعت…) → pemisah posisi
//   • يعني → penjelas nama SAMA (bukan perawi baharu) · أبيه/جدّه/جدّي → perawi (relational)
//   • buang: tashkeel, honorifik/doa, nota riwayat (قراءة/سماعًا/إجازة), TARIKH & ANGKA,
//     sisipan ( - … - ), dialog/matn di hujung
//   • marfū' → letak Nabi ﷺ sebagai akar; mawqūf/maqṭūʿ → JANGAN letak Nabi
// Pulangan: { chains: RANTAI[]→POSISI[]→nama[], marfu }.

// Baris (harakat), tatwīl, tanda Qur'an, & aksara lebar-sifar — BUKAN huruf.
const TASHKEEL = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u200B-\u200F\u202A-\u202E\uFEFF]/g;
export const strip = (s: string) =>
  (s || "")
    .replace(TASHKEEL, "")
    .replace(/[ىي]/g, "ي").replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

const PROPHET = /(رسول الله|النبي صلي|النبي عليه|عن النبي|قال النبي|سمعت النبي|سمعت رسول|ان النبي|ان رسول|عن رسول|يا رسول الله|الي النبي|الي رسول|بلغ به النبي|رفعه|يبلغ به)/;
// قال/قالا/قالت turut jadi pemisah POSISI — corak "قال فلانٌ أخبرني" (nama sebelum
// verba) & athar mawqūf "قال عبد الله …" perlu nama SELEPAS قال jadi posisi baharu.
// Dialog selepas قال ditapis oleh STOP; ulangan nama dibuang oleh dedup `seen`.
const CONNECT = /(?:وحدثنا|وحدثني|واخبرنا|واخبرني|فحدثنا|فحدثني|حدثناه|حدثنا|حدثني|حدثهم|حدثه|اخبرناه|اخبرنا|اخبرني|اخبرهم|انبانا|انباني|انبانا|ثنا|انا |سمعت|سمعته|سمع |عن |قال لنا|قال لي|كتب الي|قرات علي|قري علي|روي عن|رواه عن|قالوا|قالا|قالت|قال)/g;
const NOISE = /(رضي الله عنهما|رضي الله عنهم|رضي الله عنها|رضي الله عنه|رضي الله عنهن|صلي الله عليه وسلم|صلي الله عليه واله|عليه السلام|عليه الصلاه والسلام|رحمه الله|رحمهم الله|تعالي|عز وجل|تبارك وتعالي|علي المنبر|واللفظ له|واللفظ لـ?\S*|هذا لفظ\S*|وهذا حديثه|وهذا لفظ\S*|جميعا|كلاهما|واللفظ|زاد فيه|زاد|واللفظ لهما)/g;

// Perkataan SEMPADAN nama: percakapan/aksi (matn), nota riwayat, tarikh.
const STOP = new Set([
  "قال", "قالت", "قالوا", "قالا", "انه", "انها", "انهم", "يقول", "تقول", "يقولون", "ان", "سال", "سالت",
  "فقال", "وقال", "فقالت", "يحدث", "تحدث", "اخبره", "اخبرها", "كان", "كانت", "حدث", "حدثت",
  "يخطب", "خطب", "يخطبه", "سمعته", "سمعتها", "رايت", "رايته", "رات", "دخلت", "اتيت", "جاء", "جاءت",
  "وهو", "وهي", "فلما", "لما", "بينما", "بينا", "اذ", "اذا", "فاذا", "حين", "حتي", "ثم", "فذكر", "يذكر", "ذكر",
  "نحو", "نحوه", "مثل", "بمثله", "قلت", "قلنا", "كنا", "كنت",
  // isyarat/gerak badan (bukan perawi): "وأومأ بيده إلى دار عبد الله"
  "اوما", "فاوما", "يومي", "اشار", "فاشار", "يشير", "بيده",
  "بنحوه", "بهذا", "بهذه", "يا", "يعني", "يعنى", "لفظه", "معناه", "قصته", "الحديث", "فذكره", "بمعناه",
  // nota riwayat
  "قراءه", "سماعا", "املاء", "اجازه", "اذنا", "مناوله", "قدم", "وفد", "المعروف", "يعرف", "بلده",
  "فيما", "اذن", "مكاتبه", "قدمها",
  // tarikh
  "سنه", "عام", "شهر", "صفر", "محرم", "ربيع", "جمادي", "رجب", "شعبان", "رمضان", "شوال", "القعده", "الحجه",
]);
// Angka (ejaan) — mungkin ada awalan و.
const NUM = /^و?(واحد|احدي|اثنتين|اثنين|ثنتين|ثلاث|اربع|خمس|ست|سبع|ثمان|ثماني|تسع|عشر|عشره|بضع|نيف|عشرين|عشرون|ثلاثين|ثلاثون|اربعين|اربعون|خمسين|خمسون|ستين|ستون|سبعين|سبعون|ثمانين|ثمانون|تسعين|تسعون|مايه|ميه|مايتين|ميتين|ثلاثمايه|ثلاثميه|اربعمايه|اربعميه|خمسمايه|خمسميه|ستمايه|ستميه|سبعمايه|سبعميه|ثمانمايه|ثمانميه|تسعمايه|تسعميه|الف|الفين|اثنتي|احدي)$/;

const NASAB_BEFORE = new Set(["بن", "ابن", "ابي", "ابو", "ابا", "عبد", "عبيد", "ام", "ذو", "ذي", "ال", "الي", "عن"]);
const WAW_NAMES = new Set([
  "وقاص", "وائل", "وهب", "وهيب", "واقد", "وكيع", "ورقاء", "وليد", "واصل", "وبره", "وحشي",
  "واثله", "وابصه", "واسع", "وردان", "وهبان", "وداعه", "ورقه", "واقم", "وقدان", "وضاح", "ورد",
  "وازع", "واقدي", "وثيمه", "ودان", "وهابه", "وراد", "ورقان", "واقف", "واصله", "وشيك",
]);

const cleanSeg = (seg: string) =>
  seg.replace(NOISE, " ").replace(/-[^-]{0,60}-/g, " ").replace(/\([^)]{0,60}\)/g, " ")
     // "سفيان يعني ابن عيينة" / "سفيان هو ابن عيينة" → penjelas orang SAMA → sambung nasab
     .replace(/(?:يعني|يعنى|وهو|هو) ابن /g, " بن ")
     .replace(/[،:؛.,"'()«»\[\]]/g, " ").replace(/\s+/g, " ").trim();

function toName(seg: string): string | null {
  let tok = cleanSeg(seg).split(" ").filter(Boolean);
  tok = tok.filter((w) => w !== "يعني" && w !== "يعنى"); // penjelas → sambung nama sama
  const cut = tok.findIndex((w) => STOP.has(w) || NUM.test(w));
  if (cut === 0) return null;
  if (cut > 0) tok = tok.slice(0, cut);
  if (!tok.length) return null;
  // ابن di tengah nasab → بن (selaras name_search korpus); ابن di depan kekal (ابن عباس)
  tok = tok.map((w, i) => (i > 0 && w === "ابن" ? "بن" : w));
  const name = tok.join(" ").trim();
  // nasab panjang dibenarkan (≤16 token); tolak jika terlalu pendek
  if (name.length < 3 || tok.length > 16) return null;
  return name;
}

/** Bersih nama paparan sanad tersimpan (potong verba/tarikh terlekat, cth "عليا يخطب"→"عليا"). */
export const cleanName = (s: string) => toName(strip(s)) ?? strip(s);

/** Marfū' = teks sampai kepada Nabi ﷺ. (mawqūf/maqṭūʿ → jangan papar nod Nabi) */
export const isMarfu = (matn: string) => /النبي|رسول الله|رسول اللـه/.test(strip(matn || ""));

function toParallel(seg: string): string[] {
  const words = cleanSeg(seg).split(" ").filter(Boolean);
  const groups: string[][] = [[]];
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
  return [...new Set(groups.map((g) => toName(g.join(" "))).filter((x): x is string => !!x))];
}

export type ParsedIsnad = { chains: string[][][]; marfu: boolean };

export function parseIsnadChains(matn: string): ParsedIsnad {
  let t = strip(matn);
  if (!t) return { chains: [], marfu: false };
  t = t.replace(/-[^-]{0,60}-/g, " ").replace(/\([^)]{0,60}\)/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
  // relational (أبيه/جدّه/جدّي…) = perawi → sisip 'عن' supaya jadi posisi tersendiri
  t = t.replace(/(?<![ء-ي])(ابيه|ابيها|جده|جدها|جدي|جدتي|جدته|امه|امها|امي|عمه|عمها|عمي|خاله|خالها|خالي|ابنه|ابنته)(?![ء-ي])/g, " عن $1 ");

  // marfū' = sanad SAMPAI Nabi. Penanda luas (النبي/رسول الله) sebab NOISE dah buang
  // "صلى الله عليه وسلم". Titik potong = penanda paling awal (matn selepasnya).
  const MARFU = /النبي|رسول الله|رسول اللـه/;
  const marfu = MARFU.test(t);
  const mm = t.search(MARFU);
  const isnad = mm > 0 ? t.slice(0, mm) : (marfu ? "" : t); // tiada had panjang

  const branches = isnad.split(/\sح(?=\s|و)/).map((s) => s.trim()).filter(Boolean);
  const chains: string[][][] = [];
  for (const br of branches) {
    const positions: string[][] = [];
    const seen = new Set<string>();
    for (let seg of br.split(CONNECT)) {
      seg = seg.trim();
      if (!seg) continue;
      const names = toParallel(seg);
      if (!names.length) continue;
      const key = names.join("|");
      if (seen.has(key)) continue; // buang ulang (dialog ulang nama)
      seen.add(key);
      positions.push(names);
    }
    if (positions.length) chains.push(positions);
  }
  return { chains, marfu };
}
