// Glosari istilah ulum al-hadith — deep research (jarh wa ta'dil + mustalah).
// Setiap entri: ar (Arab), tr (transliterasi), ms/en (terjemahan), dms/den (definisi BM/EN).
// Definisi teks ARAB dibiar kosong sehingga sumber Arab asal dimuat naik.
// Digunakan oleh: translate.mjs (suntik istilah) + halaman /glosari (papar).
export const GLOSSARY_DATA = [
  // ── ا ──
  { ar: "إسناد", tr: "isnād", ms: "sanad / isnad", en: "chain of narration", dms: "Rangkaian perawi yang menyampaikan matan hadis dari satu generasi ke generasi.", den: "The chain of narrators transmitting the text of a hadith." },
  { ar: "آحاد", tr: "āḥād", ms: "ahad", en: "solitary report", dms: "Hadis yang tidak mencapai darjat mutawatir; diriwayatkan oleh bilangan terhad.", den: "A report that does not reach the level of mutawātir; transmitted by a limited number." },
  { ar: "اتصال", tr: "ittiṣāl", ms: "ittisal (persambungan)", en: "continuity", dms: "Keadaan sanad yang bersambung tanpa terputus.", den: "An unbroken, continuous chain of narration." },
  // ── ت ──
  { ar: "تابعي", tr: "tābiʿī", ms: "tabiin", en: "Successor", dms: "Orang yang bertemu seorang Sahabat dalam keadaan beriman dan mati sebagai Muslim.", den: "One who met a Companion as a believer and died as a Muslim." },
  { ar: "تخريج", tr: "takhrīj", ms: "takhrij", en: "documentation of sources", dms: "Menyebut sumber asal hadis dalam kitab-kitab dan menilai sanadnya.", den: "Tracing a hadith to its original sources and evaluating its chain." },
  { ar: "تدليس", tr: "tadlīs", ms: "tadlis", en: "concealment of a defect", dms: "Menyembunyikan kecacatan dalam sanad, mis. menggugurkan perawi yang ditemui.", den: "Concealing a defect in the chain, e.g. dropping a narrator one met." },
  { ar: "تعديل", tr: "taʿdīl", ms: "ta'dil", en: "validation of a narrator", dms: "Menyatakan seseorang perawi itu adil dan diterima riwayatnya.", den: "Declaring a narrator upright and his narration acceptable." },
  { ar: "تواتر", tr: "tawātur", ms: "tawatur", en: "mass transmission", dms: "Riwayat oleh ramai perawi yang mustahil bersepakat berdusta.", den: "Transmission by so many that collusion on a lie is impossible." },
  // ── ث ──
  { ar: "ثقة", tr: "thiqah", ms: "thiqah (dipercayai)", en: "trustworthy", dms: "Perawi yang adil (beragama) lagi dabit (kuat hafalan).", den: "A narrator who is upright and precise in memory." },
  { ar: "ثبت", tr: "thabt", ms: "thabt (teguh)", en: "firm/precise", dms: "Perawi yang amat teguh dan teliti dalam periwayatan.", den: "A narrator who is exceptionally firm and accurate." },
  // ── ج ──
  { ar: "جرح", tr: "jarḥ", ms: "jarh (celaan)", en: "disparagement", dms: "Mencela perawi dengan sebab yang menjatuhkan riwayatnya.", den: "Criticising a narrator for reasons that weaken his narration." },
  { ar: "جرح وتعديل", tr: "jarḥ wa taʿdīl", ms: "jarh wa ta'dil", en: "narrator criticism & validation", dms: "Ilmu menilai perawi: mencela (jarh) atau memuji (ta'dil).", den: "The science of evaluating narrators: criticism and validation." },
  // ── ح ──
  { ar: "حديث", tr: "ḥadīth", ms: "hadis", en: "hadith", dms: "Perkataan, perbuatan, perakuan atau sifat Nabi SAW.", den: "The sayings, actions, approvals or attributes of the Prophet ﷺ." },
  { ar: "حسن", tr: "ḥasan", ms: "hasan", en: "good (fair)", dms: "Hadis sahih yang hafalan sebahagian perawinya kurang sedikit.", den: "Sound hadith in which some narrators are slightly less precise." },
  { ar: "حافظ", tr: "ḥāfiẓ", ms: "hafiz", en: "hadith memoriser", dms: "Pakar hadis yang menghafaz sejumlah besar hadis beserta sanad.", den: "A hadith expert who memorised a vast number of hadiths with chains." },
  // ── خ ──
  { ar: "خبر", tr: "khabar", ms: "khabar", en: "report", dms: "Berita; pada sebahagian ulama sama makna dengan hadis.", den: "A report; for some scholars synonymous with hadith." },
  // ── ر ──
  { ar: "راوي", tr: "rāwī", ms: "perawi", en: "narrator", dms: "Orang yang menyampaikan hadis dalam sanad.", den: "One who transmits a hadith within the chain." },
  { ar: "رواية", tr: "riwāyah", ms: "riwayah", en: "transmission", dms: "Penyampaian hadis daripada seorang perawi kepada yang lain.", den: "The transmission of a hadith from one narrator to another." },
  // ── س ──
  { ar: "سند", tr: "sanad", ms: "sanad", en: "chain", dms: "Jalan yang menyampaikan kepada matan; rangkaian perawi.", den: "The pathway leading to the text; the chain of narrators." },
  // ── ش ──
  { ar: "شاذ", tr: "shādh", ms: "syaz", en: "anomalous", dms: "Riwayat perawi thiqah yang menyalahi perawi yang lebih utama.", den: "A report by a reliable narrator contradicting a more reliable one." },
  { ar: "شاهد", tr: "shāhid", ms: "syahid", en: "corroborating report", dms: "Hadis menyokong dari Sahabat lain dengan makna serupa.", den: "A supporting hadith from another Companion with similar meaning." },
  // ── ص ──
  { ar: "صحيح", tr: "ṣaḥīḥ", ms: "sahih", en: "authentic", dms: "Hadis bersambung sanad oleh perawi adil lagi dabit, tanpa syaz & illat.", den: "A hadith with a continuous chain of upright, precise narrators, free of anomaly and defect." },
  { ar: "صحابي", tr: "ṣaḥābī", ms: "sahabat", en: "Companion", dms: "Orang yang bertemu Nabi SAW dalam keadaan beriman dan mati sebagai Muslim.", den: "One who met the Prophet ﷺ as a believer and died a Muslim." },
  { ar: "صدوق", tr: "ṣadūq", ms: "saduq (jujur)", en: "truthful", dms: "Perawi jujur namun hafalannya kurang sedikit daripada thiqah.", den: "A truthful narrator whose precision is slightly below thiqah." },
  // ── ض ──
  { ar: "ضعيف", tr: "ḍaʿīf", ms: "daif (lemah)", en: "weak", dms: "Hadis yang hilang satu atau lebih syarat sahih atau hasan.", den: "A hadith lacking one or more conditions of ṣaḥīḥ or ḥasan." },
  { ar: "ضابط", tr: "ḍābiṭ", ms: "dabit (teliti)", en: "precise", dms: "Perawi yang kuat dan teliti hafalannya.", den: "A narrator with strong, accurate retention." },
  // ── ط ──
  { ar: "طبقة", tr: "ṭabaqah", ms: "tabaqat (lapisan)", en: "generation/layer", dms: "Kumpulan perawi yang sezaman atau setara dalam periwayatan.", den: "A class of narrators of the same era or level." },
  // ── ع ──
  { ar: "علة", tr: "ʿillah", ms: "illat (kecacatan)", en: "hidden defect", dms: "Sebab tersembunyi yang mencacatkan hadis yang zahirnya selamat.", den: "A subtle defect undermining a hadith that appears sound." },
  { ar: "عنعنة", tr: "ʿanʿanah", ms: "an'anah", en: "transmission by ‘from’", dms: "Periwayatan dengan lafaz “daripada” (عن) tanpa nyata cara dengar.", den: "Narration using ‘from’ (ʿan) without specifying how it was heard." },
  { ar: "عزيز", tr: "ʿazīz", ms: "aziz", en: "rare (two chains)", dms: "Hadis yang diriwayatkan oleh sekurang-kurangnya dua perawi pada setiap tabaqat.", den: "A hadith narrated by at least two narrators at each level." },
  // ── غ ──
  { ar: "غريب", tr: "gharīb", ms: "gharib", en: "strange (single chain)", dms: "Hadis yang diriwayatkan seorang perawi sahaja pada satu tahap sanad.", den: "A hadith narrated by only one narrator at some point in the chain." },
  // ── م ──
  { ar: "متن", tr: "matn", ms: "matan", en: "text", dms: "Teks atau kandungan hadis selepas sanad.", den: "The text or content of the hadith after the chain." },
  { ar: "متواتر", tr: "mutawātir", ms: "mutawatir", en: "mass-transmitted", dms: "Hadis yang diriwayatkan ramai sehingga pasti benar.", den: "A hadith transmitted by a multitude, yielding certainty." },
  { ar: "مرفوع", tr: "marfūʿ", ms: "marfu'", en: "elevated (to the Prophet)", dms: "Yang disandarkan kepada Nabi SAW.", den: "Attributed to the Prophet ﷺ." },
  { ar: "موقوف", tr: "mawqūf", ms: "mauquf", en: "halted (at a Companion)", dms: "Yang disandarkan kepada Sahabat sahaja.", den: "Attributed only to a Companion." },
  { ar: "مقطوع", tr: "maqṭūʿ", ms: "maqtu'", en: "severed (at a Successor)", dms: "Yang disandarkan kepada Tabiin sahaja.", den: "Attributed only to a Successor." },
  { ar: "مرسل", tr: "mursal", ms: "mursal", en: "hurried (missing Companion)", dms: "Hadis yang Tabiin sandarkan terus kepada Nabi tanpa sebut Sahabat.", den: "A hadith a Successor attributes directly to the Prophet, omitting the Companion." },
  { ar: "منقطع", tr: "munqaṭiʿ", ms: "munqati'", en: "broken", dms: "Sanad yang gugur seorang perawi di tengahnya.", den: "A chain with a narrator dropped somewhere in the middle." },
  { ar: "معضل", tr: "muʿḍal", ms: "mu'dal", en: "perplexing (two dropped)", dms: "Sanad yang gugur dua perawi atau lebih berturut-turut.", den: "A chain with two or more consecutive narrators dropped." },
  { ar: "مدلس", tr: "mudallas", ms: "mudallas", en: "concealed-defect report", dms: "Hadis yang berlaku padanya tadlis.", den: "A hadith affected by tadlīs (concealment)." },
  { ar: "منكر", tr: "munkar", ms: "munkar", en: "denounced", dms: "Riwayat perawi daif yang menyalahi perawi yang thiqah.", den: "A report by a weak narrator contradicting reliable narrators." },
  { ar: "موضوع", tr: "mawḍūʿ", ms: "maudu' (palsu)", en: "fabricated", dms: "Hadis yang direka dan dusta atas nama Nabi SAW.", den: "A fabricated report falsely attributed to the Prophet ﷺ." },
  { ar: "متروك", tr: "matrūk", ms: "matruk", en: "abandoned", dms: "Hadis perawi yang dituduh berdusta; ditinggalkan.", den: "A hadith from a narrator accused of lying; abandoned." },
  { ar: "مقبول", tr: "maqbūl", ms: "maqbul", en: "accepted", dms: "Perawi yang diterima riwayatnya bila ada sokongan.", den: "A narrator whose report is accepted when corroborated." },
  { ar: "مجهول", tr: "majhūl", ms: "majhul", en: "unknown", dms: "Perawi yang tidak dikenali keadaan atau individunya.", den: "A narrator whose status or identity is unknown." },
  { ar: "مستور", tr: "mastūr", ms: "mastur", en: "concealed status", dms: "Perawi yang diketahui zahirnya adil tetapi batinnya tidak jelas.", den: "A narrator outwardly upright but whose inner state is unclear." },
  { ar: "مشهور", tr: "mashhūr", ms: "masyhur", en: "well-known", dms: "Hadis yang diriwayatkan oleh tiga perawi atau lebih, belum mutawatir.", den: "A hadith narrated by three or more, short of mutawātir." },
  // ── و ──
  { ar: "وضع", tr: "waḍʿ", ms: "wadh' (pemalsuan)", en: "fabrication", dms: "Perbuatan mereka-reka hadis palsu.", den: "The act of fabricating false hadith." },
];

// Map ringkas (ar → ms) untuk suntikan prompt terjemahan.
export const GLOSSARY = Object.fromEntries(GLOSSARY_DATA.map((g) => [g.ar, g.ms]));
const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

export function glossaryFor(text) {
  if (!text) return "";
  const hits = [];
  for (const k of KEYS) if (text.includes(k)) hits.push(`${k} = ${GLOSSARY[k]}`);
  return hits.length ? `\nIstilah teknikal (WAJIB guna ejaan ini): ${hits.slice(0, 12).join("; ")}.` : "";
}
