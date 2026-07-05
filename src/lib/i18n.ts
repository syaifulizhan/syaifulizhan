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
  navPerawi: { bm: "Perawi", en: "Narrators", ar: "الرُّواة" },
  navHadis: { bm: "Hadis", en: "Hadith", ar: "الحديث" },
  navGlosari: { bm: "Glosari", en: "Glossary", ar: "المُصطلحات" },
  navSyarah: { bm: "Syarah", en: "Sharh", ar: "الشُروح" },

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
    bm: "Hadis dibawa dengan <b>sanad</b>, takhrij dan darjatnya — telus, teliti, dalam <b>bahasa kita</b>.",
    en: "Every hadith carried with its <b>isnād</b>, takhrīj and ruling — transparent, rigorous, <b>in your language</b>.",
    ar: "كلُّ حديثٍ بسنده وتخريجه وحكمه — بيانٌ للأذهان، في كلِّ لغة.",
  },
  heroCta1: {
    bm: "Jana Syajarat al-Isnad →",
    en: "Generate Isnād Tree →",
    ar: "وَلِّد شجرة الإسناد →",
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
  card1H3: { bm: "Hadis", en: "Hadith", ar: "الحديث" },
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

  // Brand — disesuaikan ikut bahasa (Arab tulis penuh Arab)
  brandMain: {
    bm: "Dewan <em>Izhan</em>",
    en: "Dewan <em>Izhan</em>",
    ar: "دِيوَان <em>الإِذهَان</em>",
  },
  footRujukan: { bm: "Rujukan", en: "References", ar: "المراجع" },

  // Carian
  searchTitle: { bm: "Cari dalam korpus", en: "Search the corpus", ar: "البحث في المُدوَّنة" },
  searchBandH: { bm: "Jelajah hadis, perawi & kitab", en: "Explore hadith, narrators & books", ar: "تصفّح الحديث والرواة والكتب" },
  searchPlaceholder: {
    bm: "Kalimah gharibah, teks hadis, nama perawi atau kitab…",
    en: "A word, hadith text, narrator or book name…",
    ar: "كلمة غريبة، نص حديث، اسم راوٍ أو كتاب…",
  },
  searchBtn: { bm: "Cari", en: "Search", ar: "بحث" },
  searchKitab: { bm: "Kitab", en: "Books", ar: "الكتب" },
  searchNone: { bm: "Tiada hasil.", en: "No results.", ar: "لا نتائج." },
  searchPrompt: {
    bm: "Taip untuk cari hadis, perawi atau kitab.",
    en: "Type to search hadith, narrators or books.",
    ar: "اكتب للبحث في الحديث أو الرواة أو الكتب.",
  },

  // Isnad / rantai
  isnadLinked: { bm: "berpaut", en: "linked", ar: "مُرتبِط" },
  isnadSanad: { bm: "sanad", en: "chain", ar: "سند" },
  isnadPerawi: { bm: "perawi", en: "narrators", ar: "رواة" },

  // Chrome halaman hadis/kitab
  hadisCount: { bm: "hadis", en: "hadith", ar: "حديث" },
  pageLabel: { bm: "Halaman", en: "Page", ar: "صفحة" },
  raqmLabel: { bm: "No.", en: "No.", ar: "رقم" },
  kitabEmpty: {
    bm: "Belum ada hadis untuk kitab ini.",
    en: "No hadith for this book yet.",
    ar: "لا أحاديث لهذا الكتاب بعد.",
  },
  gradeLabel: { bm: "Taraf", en: "Grade", ar: "الدرجة" },
  hadisExplorer: { bm: "Penjelajah Hadis", en: "Hadith Explorer", ar: "مُستكشِف الحديث" },
  inCorpus: { bm: "hadis dalam korpus setakat ini.", en: "hadith in the corpus so far.", ar: "حديث في المُدوَّنة حتى الآن." },
  searchResults: { bm: "Hasil carian", en: "Search results", ar: "نتائج البحث" },

  // Perawi
  perawiExplorer: { bm: "Penjelajah Perawi", en: "Narrator Explorer", ar: "مُستكشِف الرواة" },
  perawiH1: { bm: "Perawi Hadis", en: "Hadith Narrators", ar: "رُواة الحديث" },
  narrInCorpus: { bm: "perawi dalam korpus setakat ini.", en: "narrators in the corpus so far.", ar: "راوٍ في المُدوَّنة حتى الآن." },
  narrNone: { bm: "Tiada perawi padan", en: "No matching narrator", ar: "لا راوٍ مُطابِق" },
  perawiPlaceholder: { bm: "Cari nama perawi…", en: "Search narrator name…", ar: "ابحث عن اسم راوٍ…" },
  narrInfo: { bm: "Maklumat", en: "Information", ar: "معلومات" },
  narrJarh: { bm: "Jarh wa Taʿdil — penilaian ulama", en: "Jarh wa Taʿdīl — scholarly evaluation", ar: "الجرح والتعديل — أحكام العلماء" },
  narrGraph: { bm: "Graf Sanad — guru & murid", en: "Isnād Graph — teachers & students", ar: "شبكة الإسناد — الشيوخ والتلاميذ" },
  narrTeachers: { bm: "Guru", en: "Teachers", ar: "الشيوخ" },
  narrStudents: { bm: "Murid", en: "Students", ar: "التلاميذ" },
  narrNoTeachers: { bm: "Belum ada guru terpadan.", en: "No matched teachers yet.", ar: "لا شيوخ مُطابَقون بعد." },
  narrNoStudents: { bm: "Belum ada murid terpadan.", en: "No matched students yet.", ar: "لا تلاميذ مُطابَقون بعد." },
  infoKunya: { bm: "Kunya", en: "Kunya", ar: "الكنية" },
  infoNisbah: { bm: "Nisbah", en: "Nisba", ar: "النسبة" },
  infoProfession: { bm: "Pekerjaan", en: "Profession", ar: "المهنة" },
  infoRegion: { bm: "Tinggal di", en: "Lived in", ar: "الإقامة" },
  infoMawla: { bm: "Naungan", en: "Patronage", ar: "الولاء" },
  infoDeath: { bm: "Wafat", en: "Died", ar: "الوفاة" },
  infoDeathPlace: { bm: "Tempat wafat", en: "Place of death", ar: "مكان الوفاة" },

  // Glosari
  glosariTitle: { bm: "Glosari Istilah Hadis", en: "Hadith Terminology Glossary", ar: "مُعجم مصطلحات الحديث" },
  glosariH1: { bm: "Kamus Istilah", en: "Terminology Dictionary", ar: "قاموس المصطلحات" },
  glosariDesc: {
    bm: "Istilah ʿulūm al-hadith (mustalah & jarh wa taʿdil) — teks Arab, transliterasi, terjemahan & definisi.",
    en: "Hadith science terms (muṣṭalaḥ & jarh wa taʿdīl) — Arabic text, transliteration, translation & definition.",
    ar: "مصطلحات علوم الحديث (المصطلح والجرح والتعديل) — نصٌّ عربي ونقحرة وترجمة وتعريف.",
  },
  istilahWord: { bm: "istilah", en: "terms", ar: "مصطلح" },
  glosariSearch: { bm: "Cari istilah… (Arab / rumi / makna)", en: "Search a term… (Arabic / Latin / meaning)", ar: "ابحث عن مصطلح… (عربي / لاتيني / معنى)" },
  glosariNoMatch: { bm: "Tiada istilah padan.", en: "No matching term.", ar: "لا مصطلح مُطابِق." },
  glosariEmpty: { bm: "Glosari belum di-seed.", en: "Glossary not seeded yet.", ar: "لم يُملأ المعجم بعد." },

  // Isnad tooltip + cadang pembetulan
  isnadUnmatched: { bm: "Perawi belum dipadan dgn korpus", en: "Narrator not yet matched to corpus", ar: "راوٍ غير مُطابَق بالمُدوَّنة بعد" },
  suggestBtn: { bm: "Cadang pembetulan", en: "Suggest a correction", ar: "اقترح تصحيحاً" },
  suggestText: { bm: "Teks pembetulan dicadangkan…", en: "Suggested correction text…", ar: "نص التصحيح المقترح…" },
  suggestReason: { bm: "Sebab (pilihan)", en: "Reason (optional)", ar: "السبب (اختياري)" },
  suggestName: { bm: "Nama / emel anda (pilihan)", en: "Your name / email (optional)", ar: "اسمك / بريدك (اختياري)" },
  suggestSend: { bm: "Hantar cadangan", en: "Send suggestion", ar: "إرسال الاقتراح" },
  suggestDone: { bm: "Terima kasih — cadangan dihantar untuk semakan admin.", en: "Thank you — suggestion sent for admin review.", ar: "شكراً — أُرسل الاقتراح لمراجعة المشرف." },
} satisfies Record<string, Tr>;

export type TKey = keyof typeof T;
