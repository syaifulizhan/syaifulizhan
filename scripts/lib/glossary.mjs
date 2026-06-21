// Glosari istilah ulum al-hadith — deep research, TRILINGUAL (Arab+BM+English).
// Entri: ar (istilah), tr (transliterasi), ms/en (terjemahan), dar/dms/den (definisi Arab/BM/EN).
// Definisi Arab dari penyelidikan istilah established (bukan OCR scan).
// Digunakan: translate.mjs (suntik istilah) + halaman /glosari.
export const GLOSSARY_DATA = [
  // ── ا ──
  { ar: "إسناد", tr: "isnād", ms: "sanad / isnad", en: "chain of narration", dar: "سلسلة الرواة الموصلة إلى المتن.", dms: "Rangkaian perawi yang menyampaikan matan hadis dari satu generasi ke generasi.", den: "The chain of narrators transmitting the text of a hadith." },
  { ar: "آحاد", tr: "āḥād", ms: "ahad", en: "solitary report", dar: "ما لم يبلغ حدّ التواتر.", dms: "Hadis yang tidak mencapai darjat mutawatir; diriwayatkan oleh bilangan terhad.", den: "A report that does not reach the level of mutawātir." },
  { ar: "اتصال", tr: "ittiṣāl", ms: "ittisal (persambungan)", en: "continuity", dar: "سماع كل راوٍ ممن فوقه.", dms: "Keadaan sanad yang bersambung tanpa terputus; setiap perawi mendengar daripada yang di atasnya.", den: "An unbroken chain where each narrator heard from the one above." },
  { ar: "أثر", tr: "athar", ms: "athar", en: "athar (report)", dar: "ما أُضيف إلى الصحابي أو التابعي، وقد يطلق على المرفوع.", dms: "Riwayat yang disandarkan kepada Sahabat atau Tabiin; kadang digunakan untuk yang marfu'.", den: "A report attributed to a Companion or Successor; sometimes used for marfūʿ." },
  // ── ت ──
  { ar: "تابعي", tr: "tābiʿī", ms: "tabiin", en: "Successor", dar: "من لقي الصحابي مؤمناً ومات على الإسلام.", dms: "Orang yang bertemu seorang Sahabat dalam keadaan beriman dan mati sebagai Muslim.", den: "One who met a Companion as a believer and died a Muslim." },
  { ar: "تخريج", tr: "takhrīj", ms: "takhrij", en: "documentation of sources", dar: "عزو الحديث إلى مصادره مع بيان حاله.", dms: "Menyebut sumber asal hadis dalam kitab-kitab dan menilai sanadnya.", den: "Tracing a hadith to its sources and stating its grade." },
  { ar: "تدليس", tr: "tadlīs", ms: "tadlis", en: "concealment of a defect", dar: "إخفاء عيب في الإسناد وتحسين لظاهره.", dms: "Menyembunyikan kecacatan dalam sanad, mis. menggugurkan perawi yang ditemui.", den: "Concealing a defect in the chain, e.g. dropping a narrator one met." },
  { ar: "تعديل", tr: "taʿdīl", ms: "ta'dil", en: "validation of a narrator", dar: "وصف الراوي بما يقتضي قبول روايته.", dms: "Menyatakan seseorang perawi itu adil dan diterima riwayatnya.", den: "Declaring a narrator upright and his narration acceptable." },
  { ar: "تواتر", tr: "tawātur", ms: "tawatur", en: "mass transmission", dar: "رواية جمع يستحيل تواطؤهم على الكذب.", dms: "Riwayat oleh ramai perawi yang mustahil bersepakat berdusta.", den: "Transmission by so many that collusion on a lie is impossible." },
  { ar: "تابع", tr: "tābiʿ", ms: "tabi' (mutaba'ah)", en: "corroborant (follow-up)", dar: "حديث يوافق رواية راوٍ آخر لفظاً أو معنى.", dms: "Riwayat yang menyokong riwayat perawi lain pada lafaz atau makna.", den: "A report supporting another narrator's report in wording or meaning." },
  // ── ث ──
  { ar: "ثقة", tr: "thiqah", ms: "thiqah (dipercayai)", en: "trustworthy", dar: "العدل الضابط.", dms: "Perawi yang adil (beragama) lagi dabit (kuat hafalan).", den: "A narrator who is upright and precise in memory." },
  { ar: "ثبت", tr: "thabt", ms: "thabt (teguh)", en: "firm/precise", dar: "المتقن الحافظ المتثبّت.", dms: "Perawi yang amat teguh dan teliti dalam periwayatan.", den: "A narrator exceptionally firm and accurate." },
  // ── ج ──
  { ar: "جرح", tr: "jarḥ", ms: "jarh (celaan)", en: "disparagement", dar: "وصف الراوي بما يقتضي ردّ روايته.", dms: "Mencela perawi dengan sebab yang menjatuhkan riwayatnya.", den: "Criticising a narrator for reasons that weaken his narration." },
  { ar: "جرح وتعديل", tr: "jarḥ wa taʿdīl", ms: "jarh wa ta'dil", en: "narrator criticism & validation", dar: "علم يُبحث فيه أحوال الرواة جرحاً وتعديلاً.", dms: "Ilmu menilai perawi: mencela (jarh) atau memuji (ta'dil).", den: "The science of evaluating narrators: criticism and validation." },
  // ── ح ──
  { ar: "حديث", tr: "ḥadīth", ms: "hadis", en: "hadith", dar: "ما أُضيف إلى النبي ﷺ من قول أو فعل أو تقرير أو صفة.", dms: "Perkataan, perbuatan, perakuan atau sifat Nabi SAW.", den: "The sayings, actions, approvals or attributes of the Prophet ﷺ." },
  { ar: "حسن", tr: "ḥasan", ms: "hasan", en: "good (fair)", dar: "ما اتصل سنده بنقل عدل خفّ ضبطه من غير شذوذ ولا علة.", dms: "Hadis sahih yang hafalan sebahagian perawinya kurang sedikit.", den: "Sound hadith in which some narrators are slightly less precise." },
  { ar: "حافظ", tr: "ḥāfiẓ", ms: "hafiz", en: "hadith memoriser", dar: "من حفظ كثيراً من الأحاديث بأسانيدها.", dms: "Pakar hadis yang menghafaz sejumlah besar hadis beserta sanad.", den: "A hadith expert who memorised vast numbers of hadiths with chains." },
  // ── خ ──
  { ar: "خبر", tr: "khabar", ms: "khabar", en: "report", dar: "ما جاء عن النبي وغيره، ويرادف الحديث عند بعضهم.", dms: "Berita; pada sebahagian ulama sama makna dengan hadis.", den: "A report; for some scholars synonymous with hadith." },
  // ── د ──
  { ar: "دراية", tr: "dirāyah", ms: "dirayah", en: "science of understanding", dar: "علم يُعرف به حال الراوي والمروي قبولاً ورداً.", dms: "Ilmu mengetahui keadaan perawi dan riwayat dari segi diterima atau ditolak.", den: "The science of knowing the state of narrator and report (acceptance/rejection)." },
  // ── ر ──
  { ar: "راوي", tr: "rāwī", ms: "perawi", en: "narrator", dar: "ناقل الحديث بالإسناد.", dms: "Orang yang menyampaikan hadis dalam sanad.", den: "One who transmits a hadith within the chain." },
  { ar: "رواية", tr: "riwāyah", ms: "riwayah", en: "transmission", dar: "نقل الحديث وإسناده إلى قائله.", dms: "Penyampaian hadis daripada seorang perawi kepada yang lain.", den: "The transmission of a hadith from one narrator to another." },
  // ── س ──
  { ar: "سند", tr: "sanad", ms: "sanad", en: "chain", dar: "الطريق الموصلة إلى المتن، وهي سلسلة الرواة.", dms: "Jalan yang menyampaikan kepada matan; rangkaian perawi.", den: "The pathway to the text; the chain of narrators." },
  // ── ش ──
  { ar: "شاذ", tr: "shādh", ms: "syaz", en: "anomalous", dar: "مخالفة الثقة لمن هو أوثق منه.", dms: "Riwayat perawi thiqah yang menyalahi perawi yang lebih utama.", den: "A reliable narrator contradicting a more reliable one." },
  { ar: "شاهد", tr: "shāhid", ms: "syahid", en: "corroborating report", dar: "حديث يوافق متن حديث آخر من رواية صحابي آخر.", dms: "Hadis menyokong dari Sahabat lain dengan makna serupa.", den: "A supporting hadith from another Companion with similar meaning." },
  // ── ص ──
  { ar: "صحيح", tr: "ṣaḥīḥ", ms: "sahih", en: "authentic", dar: "ما اتصل سنده بنقل العدل الضابط عن مثله من غير شذوذ ولا علة.", dms: "Hadis bersambung sanad oleh perawi adil lagi dabit, tanpa syaz & illat.", den: "A continuous chain of upright, precise narrators, free of anomaly and defect." },
  { ar: "صحابي", tr: "ṣaḥābī", ms: "sahabat", en: "Companion", dar: "من لقي النبي ﷺ مؤمناً به ومات على الإسلام.", dms: "Orang yang bertemu Nabi SAW dalam keadaan beriman dan mati sebagai Muslim.", den: "One who met the Prophet ﷺ as a believer and died a Muslim." },
  { ar: "صدوق", tr: "ṣadūq", ms: "saduq (jujur)", en: "truthful", dar: "من خفّ ضبطه عن درجة الثقة مع صدقه.", dms: "Perawi jujur namun hafalannya kurang sedikit daripada thiqah.", den: "A truthful narrator whose precision is slightly below thiqah." },
  // ── ض ──
  { ar: "ضعيف", tr: "ḍaʿīf", ms: "daif (lemah)", en: "weak", dar: "ما فقد شرطاً من شروط القبول.", dms: "Hadis yang hilang satu atau lebih syarat sahih atau hasan.", den: "A hadith lacking one or more conditions of acceptance." },
  { ar: "ضابط", tr: "ḍābiṭ", ms: "dabit (teliti)", en: "precise", dar: "المتيقّظ الحافظ لما يرويه.", dms: "Perawi yang kuat dan teliti hafalannya.", den: "A narrator with strong, accurate retention." },
  // ── ط ──
  { ar: "طبقة", tr: "ṭabaqah", ms: "tabaqat (lapisan)", en: "generation/layer", dar: "قوم تقاربوا في السنّ والإسناد.", dms: "Kumpulan perawi yang sezaman atau setara dalam periwayatan.", den: "A class of narrators of the same era or level." },
  // ── ع ──
  { ar: "علة", tr: "ʿillah", ms: "illat (kecacatan tersembunyi)", en: "hidden defect", dar: "سبب خفيّ قادح مع أن الظاهر السلامة.", dms: "Sebab tersembunyi yang mencacatkan hadis yang zahirnya selamat.", den: "A subtle defect undermining a hadith that appears sound." },
  { ar: "عنعنة", tr: "ʿanʿanah", ms: "an'anah", en: "transmission by ‘from’", dar: "الرواية بلفظ (عن) دون تصريح بالسماع.", dms: "Periwayatan dengan lafaz “daripada” (عن) tanpa nyata cara dengar.", den: "Narration using ‘from’ (ʿan) without specifying audition." },
  { ar: "عزيز", tr: "ʿazīz", ms: "aziz", en: "rare (two chains)", dar: "ما رواه اثنان في كل طبقة على الأقل.", dms: "Hadis yang diriwayatkan oleh sekurang-kurangnya dua perawi pada setiap tabaqat.", den: "A hadith narrated by at least two at each level." },
  { ar: "عدل", tr: "ʿadl", ms: "adil", en: "upright", dar: "المسلم البالغ العاقل السالم من الفسق وخوارم المروءة.", dms: "Perawi Muslim, baligh, berakal, selamat dari fasik dan perkara yang menjatuhkan maruah.", den: "A Muslim of sound mind, free of sin and indignity." },
  // ── غ ──
  { ar: "غريب", tr: "gharīb", ms: "gharib", en: "strange (single chain)", dar: "ما تفرّد بروايته راوٍ واحد.", dms: "Hadis yang diriwayatkan seorang perawi sahaja pada satu tahap sanad.", den: "A hadith narrated by only one narrator at some point." },
  // ── ف ──
  { ar: "فرد", tr: "fard", ms: "fard", en: "singular", dar: "ما انفرد به راوٍ، ويرادف الغريب في وجه.", dms: "Hadis yang diriwayatkan seorang sahaja; serupa gharib pada satu segi.", den: "A report transmitted by a single narrator; akin to gharīb." },
  // ── م ──
  { ar: "متن", tr: "matn", ms: "matan", en: "text", dar: "ما ينتهي إليه السند من الكلام.", dms: "Teks atau kandungan hadis selepas sanad.", den: "The text of the hadith at the end of the chain." },
  { ar: "متواتر", tr: "mutawātir", ms: "mutawatir", en: "mass-transmitted", dar: "ما رواه جمع تحيل العادة تواطؤهم على الكذب.", dms: "Hadis yang diriwayatkan ramai sehingga pasti benar.", den: "A hadith transmitted by a multitude, yielding certainty." },
  { ar: "مرفوع", tr: "marfūʿ", ms: "marfu'", en: "elevated (to the Prophet)", dar: "ما أُضيف إلى النبي ﷺ خاصة.", dms: "Yang disandarkan kepada Nabi SAW.", den: "Attributed specifically to the Prophet ﷺ." },
  { ar: "موقوف", tr: "mawqūf", ms: "mauquf", en: "halted (at a Companion)", dar: "ما أُضيف إلى الصحابي قولاً أو فعلاً.", dms: "Yang disandarkan kepada Sahabat sahaja.", den: "Attributed only to a Companion." },
  { ar: "مقطوع", tr: "maqṭūʿ", ms: "maqtu'", en: "severed (at a Successor)", dar: "ما أُضيف إلى التابعي قولاً أو فعلاً.", dms: "Yang disandarkan kepada Tabiin sahaja.", den: "Attributed only to a Successor." },
  { ar: "مرسل", tr: "mursal", ms: "mursal", en: "hurried (missing Companion)", dar: "ما أضافه التابعي إلى النبي ﷺ بإسقاط الصحابي.", dms: "Hadis yang Tabiin sandarkan terus kepada Nabi tanpa sebut Sahabat.", den: "A Successor attributing directly to the Prophet, omitting the Companion." },
  { ar: "منقطع", tr: "munqaṭiʿ", ms: "munqati'", en: "broken", dar: "ما سقط من إسناده راوٍ في أثنائه.", dms: "Sanad yang gugur seorang perawi di tengahnya.", den: "A chain with a narrator dropped in the middle." },
  { ar: "معضل", tr: "muʿḍal", ms: "mu'dal", en: "perplexing (two dropped)", dar: "ما سقط من إسناده اثنان فأكثر على التوالي.", dms: "Sanad yang gugur dua perawi atau lebih berturut-turut.", den: "A chain with two or more consecutive narrators dropped." },
  { ar: "مدلس", tr: "mudallas", ms: "mudallas", en: "concealed-defect report", dar: "ما وقع فيه التدليس.", dms: "Hadis yang berlaku padanya tadlis.", den: "A hadith affected by tadlīs." },
  { ar: "منكر", tr: "munkar", ms: "munkar", en: "denounced", dar: "ما رواه الضعيف مخالفاً للثقات.", dms: "Riwayat perawi daif yang menyalahi perawi yang thiqah.", den: "A weak narrator's report contradicting reliable ones." },
  { ar: "موضوع", tr: "mawḍūʿ", ms: "maudu' (palsu)", en: "fabricated", dar: "الكذب المختلَق المنسوب إلى النبي ﷺ.", dms: "Hadis yang direka dan dusta atas nama Nabi SAW.", den: "A fabricated report falsely attributed to the Prophet ﷺ." },
  { ar: "متروك", tr: "matrūk", ms: "matruk", en: "abandoned", dar: "ما يرويه متهم بالكذب.", dms: "Hadis perawi yang dituduh berdusta; ditinggalkan.", den: "A hadith from a narrator accused of lying." },
  { ar: "مقبول", tr: "maqbūl", ms: "maqbul", en: "accepted", dar: "من يُقبل حديثه عند المتابعة.", dms: "Perawi yang diterima riwayatnya bila ada sokongan.", den: "A narrator accepted when corroborated." },
  { ar: "مجهول", tr: "majhūl", ms: "majhul", en: "unknown", dar: "من لم تُعرف عينه أو حاله.", dms: "Perawi yang tidak dikenali keadaan atau individunya.", den: "A narrator whose identity or status is unknown." },
  { ar: "مستور", tr: "mastūr", ms: "mastur", en: "concealed status", dar: "عدل الظاهر مجهول الباطن.", dms: "Perawi yang diketahui zahirnya adil tetapi batinnya tidak jelas.", den: "Outwardly upright but inwardly unclear." },
  { ar: "مشهور", tr: "mashhūr", ms: "masyhur", en: "well-known", dar: "ما رواه ثلاثة فأكثر ولم يبلغ التواتر.", dms: "Hadis yang diriwayatkan oleh tiga perawi atau lebih, belum mutawatir.", den: "Narrated by three or more, short of mutawātir." },
  { ar: "متصل", tr: "muttaṣil", ms: "muttasil", en: "connected", dar: "ما اتصل سنده مرفوعاً أو موقوفاً.", dms: "Hadis yang bersambung sanadnya, marfu' atau mauquf.", den: "A hadith with a connected chain, marfūʿ or mawqūf." },
  { ar: "مسند", tr: "musnad", ms: "musnad", en: "supported (full chain)", dar: "ما اتصل إسناده مرفوعاً إلى النبي ﷺ.", dms: "Hadis yang sanadnya bersambung dan marfu' kepada Nabi SAW.", den: "A hadith with a connected chain raised to the Prophet ﷺ." },
  { ar: "معلق", tr: "muʿallaq", ms: "mu'allaq", en: "suspended", dar: "ما حُذف من مبدأ إسناده راوٍ فأكثر.", dms: "Hadis yang digugurkan seorang perawi atau lebih dari awal sanad.", den: "A hadith with one or more narrators dropped from the start of the chain." },
  // ── و ──
  { ar: "وضع", tr: "waḍʿ", ms: "wadh' (pemalsuan)", en: "fabrication", dar: "اختلاق الحديث ونسبته كذباً.", dms: "Perbuatan mereka-reka hadis palsu.", den: "The act of fabricating false hadith." },
];

export const GLOSSARY = Object.fromEntries(GLOSSARY_DATA.map((g) => [g.ar, g.ms]));
const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

export function glossaryFor(text) {
  if (!text) return "";
  const hits = [];
  for (const k of KEYS) if (text.includes(k)) hits.push(`${k} = ${GLOSSARY[k]}`);
  return hits.length ? `\nIstilah teknikal (WAJIB guna ejaan ini): ${hits.slice(0, 12).join("; ")}.` : "";
}
