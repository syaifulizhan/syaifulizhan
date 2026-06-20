import type { Lang } from "./types";

export type Tr = Record<Lang, string>;

/**
 * Kamus teks trilingual (BM / EN / AR).
 * Sebahagian nilai mengandungi <em>/<b> — render dengan dangerouslySetInnerHTML.
 * Nama Arab pemilik dieja dengan ذ: سَيْف الإِذهَان (bukan ز).
 */
export const T = {
  brandSub: { bm: "syaifulizhan.my", en: "syaifulizhan.my", ar: "syaifulizhan.my" },

  navSanad: {
    bm: "Penjelajah Sanad",
    en: "Isnād Explorer",
    ar: "مُستكشِف الإسناد",
  },
  navIlmu: { bm: "Ilmu", en: "Knowledge", ar: "العِلم" },
  navTentang: { bm: "Tentang", en: "About", ar: "عَن" },
  navKhidmat: { bm: "Khidmat", en: "Services", ar: "الخِدمات" },

  heroH1: {
    bm: "Ilmu yang <em>boleh disemak</em>",
    en: "Knowledge <em>worth tracing</em>",
    ar: "العِلمُ بالإِسناد",
  },
  heroSub: {
    bm: "Riwayah · Takhrij · Darjat",
    en: "Riwāyah · Takhrīj · Grading",
    ar: "الرِّواية · التَّخريج · الحُكم",
  },
  heroThesis: {
    bm: "Hadith dibawa dengan <b>sanad</b>, takhrij dan darjatnya — telus, teliti, dalam <b>bahasa kita</b>.",
    en: "Every hadith carried with its <b>isnād</b>, takhrīj and ruling — transparent, rigorous, <b>in your language</b>.",
    ar: "كلُّ حديثٍ بسنده وتخريجه وحكمه — بيانٌ للأذهان، في كلِّ لغة.",
  },
  heroCta1: {
    bm: "Cuba Penjelajah Sanad →",
    en: "Try Isnād Explorer →",
    ar: "استكشف الإسناد →",
  },
  heroCta2: {
    bm: "Jelajah Ilmu",
    en: "Explore Knowledge",
    ar: "تصفّح العلم",
  },

  sanadEyebrow: {
    bm: "Alat · Elemen Tanda",
    en: "Tool · Signature Feature",
    ar: "أداة · السِّمة المُميَّزة",
  },
  sanadH2: {
    bm: "Penjelajah Sanad",
    en: "Isnād Explorer",
    ar: "مُستكشِف الإسناد",
  },
  sanadP: {
    bm: "Pilih hadith — lihat rantaian perawinya terbentang, lengkap dengan darjat dan takhrij.",
    en: "Select a hadith — watch its chain of narrators unfold, complete with grading and takhrīj.",
    ar: "اختر حديثاً وشاهد سلسلة رواته تتكشَّف مع التخريج والحكم.",
  },
  takhrijLabel: { bm: "Takhrij:", en: "Takhrīj:", ar: "التخريج:" },
  sanadNote: {
    bm: "Data riwayah sebagai demonstrasi alat.",
    en: "Riwāyah data shown for demonstration purposes.",
    ar: "البيانات لأغراض العرض التوضيحي.",
  },
  chainTitle: {
    bm: "Silsilat al-Isnād",
    en: "Chain of Narrators",
    ar: "سِلسِلة الإسناد",
  },

  ilmuEyebrow: { bm: "Khazanah", en: "Treasury", ar: "الخَزائن" },
  ilmuH2: {
    bm: "Tiga Tunjang Ilmu",
    en: "Three Pillars of Knowledge",
    ar: "ثلاثة أركان العلم",
  },
  ilmuP: {
    bm: "Kandungan yang berpaut antara satu sama lain — metodologi yang jelas, bukan sekadar arkib.",
    en: "Interconnected content — transparent methodology, not just an archive.",
    ar: "محتوى مترابط بمنهجية واضحة، لا مجرَّد أرشيف.",
  },
  card1H3: { bm: "Hadith", en: "Hadith", ar: "الحديث" },
  card1P: {
    bm: "Matan, sanad dan hukum — disusun untuk dirujuk semula, bukan sekadar dibaca sekali lalu.",
    en: "Matn, isnād and ruling — structured for reference, not just casual reading.",
    ar: "المتن والسند والحكم — منظَّمٌ للرجوع إليه في كلِّ وقت.",
  },
  card2H3: { bm: "Riwayah", en: "Narration Science", ar: "الرِّواية" },
  card2P: {
    bm: "Cara menilai perawi, tabaqat dan jalan riwayat — metodologi yang menjadi tulang belakang setiap kesimpulan.",
    en: "Narrator evaluation, ṭabaqāt and transmission paths — the methodology behind every ruling.",
    ar: "تقييم الرواة والطبقات ووجوه الرواية — المنهج خلف كل حكم.",
  },
  card3H3: { bm: "Maqalat", en: "Articles", ar: "المقالات" },
  card3P: {
    bm: "Penulisan dan ulasan tokoh — membawa khazanah ulama Arab kepada pembaca Nusantara.",
    en: "Scholarly writing and commentary — bridging Arab scholarship to the Nusantara world.",
    ar: "كتابات وتعليقات علمية — جسرٌ بين التراث العربي وعالم النوسانتارا.",
  },

  aboutEyebrow: { bm: "Tentang", en: "About", ar: "عَن" },
  aboutH2: {
    bm: "Antara <em>madrasah</em> dan mesin",
    en: "Between the <em>madrasah</em> and the machine",
    ar: "بين <em>المدرسة</em> والتِّقنية",
  },
  aboutP1: {
    bm: "Saya <b>Muhammad Syaiful Izhan</b> — lulusan Pengajian al-Quran dan al-Sunnah, pencipta kandungan ilmu hadith dan riwayah dalam bahasa Melayu.",
    en: "I am <b>Muhammad Syaiful Izhan</b> — a graduate in Quranic and Sunnah Studies, creating hadith and riwāyah content in the Malay language.",
    ar: "أنا <b>محمد سيف الإذهان</b> — خرِّيج دراسات القرآن والسنة، وصانع محتوى في علم الحديث والرواية باللغة الملايوية.",
  },
  aboutP2: {
    bm: "Laman ini bukan sekadar tempat menyimpan ilmu. Ia bukti bahawa metodologi klasik boleh dihidupkan semula — telus, boleh disemak, dan mudah dicapai.",
    en: "This is not merely an archive. It is proof that classical methodology can be revived — transparent, verifiable, and accessible.",
    ar: "هذا الموقع ليس مجرَّد أرشيف. إنَّه دليلٌ على أن المنهج الكلاسيكي يمكن إحياؤه — شفافاً وقابلاً للتحقُّق وفي متناول الجميع.",
  },
  pillar1H4: { bm: "Ilmu", en: "Knowledge", ar: "العِلم" },
  pillar1P: {
    bm: "Latihan formal dalam Quran, Sunnah dan ʿulūm al-hadith.",
    en: "Formal training in Quran, Sunnah and ʿulūm al-ḥadīth.",
    ar: "تدريبٌ رسمي في علوم القرآن والسنة والحديث.",
  },
  pillar2H4: { bm: "Alat", en: "Tooling", ar: "التِّقنية" },
  pillar2P: {
    bm: "Membina pengalaman web yang laju, interaktif dan telus.",
    en: "Building fast, interactive, and transparent web experiences.",
    ar: "بناء تجارب ويب سريعة وتفاعلية وشفافة.",
  },
  pillar3H4: { bm: "Bahasa", en: "Language", ar: "اللُّغة" },
  pillar3P: {
    bm: "Jambatan ilmu Arab kepada audiens Melayu, Nusantara dan global.",
    en: "Bridging Arab scholarship to Malay, Nusantara and global audiences.",
    ar: "جسرٌ بين التراث العربي والجمهور الملايوي والنوسانتاري والعالمي.",
  },

  khTab: {
    bm: "Khidmat · Ruang Berasingan",
    en: "Services · Separate Space",
    ar: "الخِدمات · فضاء مُستقِل",
  },
  khH2: {
    bm: "Solusi digital untuk <em>pembawa ilmu</em>",
    en: "Digital solutions for <em>knowledge bearers</em>",
    ar: "حلولٌ رقمية لـ<em>حاملي العلم</em>",
  },
  khLead: {
    bm: "Saya bina laman web dan aplikasi untuk mereka yang berkhidmat dalam dakwah dan pendidikan.",
    en: "I build websites and applications for those serving in daʿwah and education.",
    ar: "أبني مواقع وتطبيقات لمن يخدمون في الدعوة والتربية.",
  },
  khCta: {
    bm: "Bincang projek anda →",
    en: "Discuss your project →",
    ar: "ناقِش مشروعك →",
  },
  khProof: {
    bm: "<b>Laman ini sendiri buktinya</b> — direka dan dibina sepenuhnya oleh saya.",
    en: "<b>This site is the proof</b> — designed and built entirely by me.",
    ar: "<b>هذا الموقع هو الدليل</b> — صمَّمته وبنيته بنفسي.",
  },

  footP: {
    bm: "Ilmu riwayah yang boleh disemak — dalam bahasa kita.",
    en: "Verifiable riwāyah knowledge — in your language.",
    ar: "علمٌ بالرواية قابلٌ للتحقُّق — في لغتك.",
  },
} satisfies Record<string, Tr>;

export type TKey = keyof typeof T;
