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

  // ── Jenis & darjat hadis (tambahan) ──
  { ar: "حديث قدسي", tr: "ḥadīth qudsī", ms: "hadis qudsi", en: "sacred hadith", dar: "ما يرويه النبي ﷺ عن ربه بلفظه.", dms: "Hadis yang Nabi SAW sampaikan maknanya daripada Allah dengan lafaz baginda.", den: "A hadith the Prophet ﷺ relates from his Lord in his own wording." },
  { ar: "صحيح لذاته", tr: "ṣaḥīḥ li-dhātihi", ms: "sahih li-dzatih", en: "authentic in itself", dar: "الصحيح المستوفي للشروط بذاته.", dms: "Hadis sahih yang memenuhi semua syarat dengan sendirinya.", den: "A hadith meeting all conditions of authenticity by itself." },
  { ar: "صحيح لغيره", tr: "ṣaḥīḥ li-ghayrihi", ms: "sahih li-ghairih", en: "authentic by support", dar: "الحسن لذاته إذا تعددت طرقه فارتقى.", dms: "Hadis hasan yang naik ke darjat sahih kerana banyak jalan.", den: "A ḥasan hadith elevated to ṣaḥīḥ by multiple chains." },
  { ar: "حسن لغيره", tr: "ḥasan li-ghayrihi", ms: "hasan li-ghairih", en: "good by support", dar: "الضعيف إذا تعددت طرقه وانجبر.", dms: "Hadis daif yang naik ke hasan kerana sokongan jalan lain.", den: "A weak hadith raised to ḥasan by corroborating chains." },
  { ar: "معلل", tr: "muʿallal", ms: "mu'allal", en: "defective", dar: "ما فيه علة قادحة خفية.", dms: "Hadis yang mengandungi illat (kecacatan tersembunyi).", den: "A hadith containing a subtle, damaging defect." },
  { ar: "مضطرب", tr: "muḍṭarib", ms: "mudtarib", en: "shaky", dar: "ما رُوي على أوجه مختلفة متساوية متعذّرة الترجيح.", dms: "Hadis yang diriwayatkan dengan beberapa bentuk berbeza yang sama kuat.", den: "A hadith narrated in differing, equally-weighted forms that cannot be reconciled." },
  { ar: "مقلوب", tr: "maqlūb", ms: "maqlub", en: "inverted", dar: "ما أُبدل فيه شيء بآخر في السند أو المتن.", dms: "Hadis yang ditukar ganti sesuatu padanya, pada sanad atau matan.", den: "A hadith in which something is swapped, in chain or text." },
  { ar: "مدرج", tr: "mudraj", ms: "mudraj", en: "interpolated", dar: "ما أُدخل في متنه أو سنده ما ليس منه.", dms: "Hadis yang dimasukkan padanya kata-kata yang bukan sebahagiannya.", den: "A hadith into which words not originally part of it are inserted." },
  { ar: "مصحف", tr: "muṣaḥḥaf", ms: "musahhaf", en: "misread (dots)", dar: "ما غُيّر فيه بتغيير النقط مع بقاء الصورة.", dms: "Hadis yang berubah kerana salah titik huruf.", den: "A hadith altered by misplacing the diacritical dots." },
  { ar: "محرف", tr: "muḥarraf", ms: "muharraf", en: "altered (vowels)", dar: "ما غُيّر فيه بتغيير الشكل (الحركات).", dms: "Hadis yang berubah kerana salah baris/harakat.", den: "A hadith altered by changing the vowel marks." },
  { ar: "مبهم", tr: "mubham", ms: "mubham", en: "unnamed narrator", dar: "ما فيه راوٍ لم يُسمَّ.", dms: "Hadis yang ada padanya perawi yang tidak dinamakan.", den: "A hadith containing an unnamed narrator." },
  { ar: "مسلسل", tr: "musalsal", ms: "musalsal", en: "chained (uniform)", dar: "ما تتابع رجال إسناده على صفة أو حالة واحدة.", dms: "Hadis yang perawinya berturut atas satu sifat atau keadaan yang sama.", den: "A hadith whose narrators share one uniform attribute or manner." },
  { ar: "مختلف الحديث", tr: "mukhtalaf al-ḥadīth", ms: "mukhtalaf al-hadith", en: "apparently conflicting hadith", dar: "حديثان صحيحان ظاهرهما التعارض ويمكن الجمع.", dms: "Dua hadis sahih yang zahirnya bercanggah namun boleh dihimpunkan.", den: "Two authentic hadiths apparently conflicting but reconcilable." },
  { ar: "ناسخ ومنسوخ", tr: "nāsikh wa mansūkh", ms: "nasikh & mansukh", en: "abrogating & abrogated", dar: "رفع حكم شرعي متقدم بدليل متأخر.", dms: "Hukum terkemudian yang membatalkan hukum terdahulu.", den: "A later ruling abrogating an earlier one." },

  // ── Cara menerima & menyampaikan (tahammul wa ada') ──
  { ar: "سماع", tr: "samāʿ", ms: "sama' (mendengar)", en: "audition", dar: "أن يقرأ الشيخ ويسمع الطالب.", dms: "Guru membaca dan murid mendengar — cara penerimaan tertinggi.", den: "The teacher recites and the student listens — the highest mode of reception." },
  { ar: "عرض", tr: "ʿarḍ", ms: "ardh (qira'ah)", en: "presentation/reading", dar: "أن يقرأ الطالب على الشيخ والشيخ يسمع.", dms: "Murid membaca kepada guru dan guru mendengar/mengiyakan.", den: "The student reads to the teacher who listens and approves." },
  { ar: "إجازة", tr: "ijāzah", ms: "ijazah", en: "licence to transmit", dar: "إذن الشيخ للطالب بالرواية عنه.", dms: "Keizinan guru kepada murid untuk meriwayatkan daripadanya.", den: "The teacher's permission for the student to transmit from him." },
  { ar: "مناولة", tr: "munāwalah", ms: "munawalah", en: "handing over", dar: "أن يناول الشيخ الطالب كتابه ويأذن بروايته.", dms: "Guru menyerahkan kitabnya kepada murid serta mengizinkan meriwayatkannya.", den: "The teacher hands his book to the student, licensing its transmission." },
  { ar: "مكاتبة", tr: "mukātabah", ms: "mukatabah", en: "written transmission", dar: "أن يكتب الشيخ الحديث لطالب غائب أو حاضر.", dms: "Guru menulis hadis untuk murid (hadir atau jauh).", den: "The teacher writes the hadith for a student, present or absent." },
  { ar: "وجادة", tr: "wijādah", ms: "wijadah", en: "found writing", dar: "أن يجد الطالب حديثاً بخط راوٍ لم يلقه.", dms: "Murid menemui hadis dengan tulisan perawi yang tidak ditemuinya.", den: "Finding a hadith in the handwriting of a narrator one did not meet." },

  // ── Jenis kitab hadis ──
  { ar: "المسند (كتاب)", tr: "al-musnad", ms: "musnad (jenis kitab)", en: "musnad collection", dar: "كتاب رُتّبت أحاديثه على أسماء الصحابة.", dms: "Kitab yang menyusun hadis mengikut nama Sahabat.", den: "A collection arranging hadiths by Companions' names." },
  { ar: "سنن", tr: "sunan", ms: "sunan", en: "sunan collection", dar: "كتاب رُتّب على أبواب الفقه مرفوعاً.", dms: "Kitab yang menyusun hadis hukum mengikut bab fiqh.", den: "A collection arranged by jurisprudential chapters of marfūʿ hadiths." },
  { ar: "جامع", tr: "jāmiʿ", ms: "jami'", en: "comprehensive collection", dar: "كتاب يجمع أبواب الدين كلها.", dms: "Kitab yang menghimpun kesemua bab agama.", den: "A collection encompassing all chapters of the religion." },
  { ar: "مصنف", tr: "muṣannaf", ms: "musannaf", en: "musannaf", dar: "كتاب رُتّب على الأبواب يجمع المرفوع والموقوف والمقطوع.", dms: "Kitab tersusun ikut bab, menghimpun marfu', mauquf dan maqtu'.", den: "A chapter-arranged work mixing marfūʿ, mawqūf and maqṭūʿ." },
  { ar: "معجم", tr: "muʿjam", ms: "mu'jam", en: "mu'jam", dar: "كتاب رُتّب على شيوخ المؤلف غالباً.", dms: "Kitab yang biasanya disusun mengikut nama guru pengarang.", den: "A work usually arranged by the author's teachers." },
  { ar: "مستدرك", tr: "mustadrak", ms: "mustadrak", en: "supplement", dar: "ما استُدرك على كتاب بما فاته على شرطه.", dms: "Kitab yang menambah hadis yang tertinggal dari kitab lain atas syaratnya.", den: "A work adding hadiths a prior book omitted, on its conditions." },
  { ar: "مستخرج", tr: "mustakhraj", ms: "mustakhraj", en: "extraction work", dar: "أن يأتي المصنف بأحاديث كتابٍ بأسانيد نفسه.", dms: "Kitab yang membawa hadis kitab lain dengan sanad pengarangnya sendiri.", den: "A work re-narrating another book's hadiths via the author's own chains." },
  { ar: "موطأ", tr: "muwaṭṭaʾ", ms: "muwatta'", en: "muwatta'", dar: "كتاب جمع المرفوع والموقوف والآثار على الأبواب.", dms: "Kitab yang menghimpun marfu', mauquf dan athar mengikut bab.", den: "A work compiling marfūʿ, mawqūf and reports by chapters." },
  { ar: "أطراف", tr: "aṭrāf", ms: "atraf", en: " atraf index", dar: "كتاب يذكر طرف الحديث الدالّ عليه مع أسانيده.", dms: "Kitab yang menyebut pangkal hadis sahaja beserta sanad-sanadnya.", den: "A work citing only the opening of each hadith with its chains." },

  // ── Kategori perawi (tambahan) ──
  { ar: "مخضرم", tr: "mukhaḍram", ms: "mukhadram", en: "lived across two eras", dar: "من أدرك الجاهلية والإسلام ولم يلقَ النبي ﷺ.", dms: "Orang yang hidup di zaman jahiliah dan Islam tetapi tidak bertemu Nabi SAW.", den: "One who lived in the pre-Islamic and Islamic eras but did not meet the Prophet ﷺ." },
  { ar: "أتباع التابعين", tr: "atbāʿ al-tābiʿīn", ms: "atba' al-tabiin", en: "followers of the Successors", dar: "من لقي التابعي مؤمناً ومات على الإسلام.", dms: "Orang yang bertemu Tabiin dalam keadaan beriman dan mati sebagai Muslim.", den: "One who met a Successor as a believer and died a Muslim." },
  { ar: "أقران", tr: "aqrān", ms: "aqran (seangkatan)", en: "peers", dar: "المتقاربون في السنّ والإسناد.", dms: "Perawi yang hampir sama umur dan tingkatan sanad.", den: "Narrators close in age and level of transmission." },
  { ar: "مدبج", tr: "mudabbaj", ms: "mudabbaj", en: "mutual peer narration", dar: "رواية القرينين كلٍّ عن الآخر.", dms: "Dua perawi seangkatan yang saling meriwayatkan antara satu sama lain.", den: "Two peers each narrating from the other." },

  // ── Jarh wa ta'dil (martabat tambahan) ──
  { ar: "إمام", tr: "imām", ms: "imam", en: "leading authority", dar: "العالم المتبوع المرجع في الفنّ.", dms: "Ulama rujukan yang diikuti dalam bidangnya.", den: "A followed, authoritative scholar in the field." },
  { ar: "حجة", tr: "ḥujjah", ms: "hujjah", en: "authoritative proof", dar: "الثقة الضابط الذي يُحتجّ به.", dms: "Perawi thiqah lagi dabit yang dijadikan hujah.", den: "A reliable, precise narrator taken as proof." },
  { ar: "صالح الحديث", tr: "ṣāliḥ al-ḥadīth", ms: "salih al-hadith", en: "fit for consideration", dar: "من يُكتب حديثه للاعتبار.", dms: "Perawi yang hadisnya ditulis untuk dipertimbangkan (i'tibar).", den: "One whose hadith is recorded for corroborative consideration." },
  { ar: "متهم بالكذب", tr: "muttaham bi-l-kadhib", ms: "dituduh berdusta", en: "accused of lying", dar: "من اتُّهم بالكذب في الحديث.", dms: "Perawi yang dituduh berdusta dalam hadis (martabat sangat lemah).", den: "A narrator accused of lying in hadith (a very weak rank)." },
  { ar: "ضعيف جدا", tr: "ḍaʿīf jiddan", ms: "daif jiddan (sangat lemah)", en: "very weak", dar: "شديد الضعف لا ينجبر بمثله.", dms: "Hadis yang amat lemah, tidak dapat dikuatkan oleh yang seumpamanya.", den: "Severely weak, not strengthened by similar reports." },
  { ar: "لين الحديث", tr: "layyin al-ḥadīth", ms: "layyin al-hadith", en: "soft (slightly weak)", dar: "ضعف يسير في الراوي لا يُسقط حديثه بالكلية.", dms: "Kelemahan ringan pada perawi yang tidak menggugurkan hadisnya sepenuhnya.", den: "A slight weakness in a narrator that does not wholly drop his hadith." },

  // ── Lain-lain asas ──
  { ar: "اعتبار", tr: "iʿtibār", ms: "i'tibar", en: "comparative examination", dar: "تتبّع طرق الحديث لمعرفة المتابعات والشواهد.", dms: "Menyelidik jalan-jalan hadis untuk mengetahui mutaba'ah dan syahid.", den: "Surveying a hadith's chains to find corroborants and witnesses." },
  { ar: "متابعة", tr: "mutābaʿah", ms: "mutaba'ah", en: "corroboration", dar: "موافقة راوٍ لآخر في روايته.", dms: "Persamaan seorang perawi dengan perawi lain dalam riwayatnya.", den: "One narrator's agreement with another in transmission." },
  { ar: "علو الإسناد", tr: "ʿuluww al-isnād", ms: "uluw al-isnad", en: "high chain", dar: "قلّة عدد رجال الإسناد إلى النبي ﷺ.", dms: "Sedikit bilangan perawi sanad sehingga ke Nabi SAW (lebih utama).", den: "A chain with fewer narrators up to the Prophet ﷺ (more prized)." },
  { ar: "نزول الإسناد", tr: "nuzūl al-isnād", ms: "nuzul al-isnad", en: "low chain", dar: "كثرة عدد رجال الإسناد، خلاف العلو.", dms: "Banyak bilangan perawi sanad — lawan kepada uluw.", den: "A chain with more narrators — the opposite of ʿuluww." },
  { ar: "رجال", tr: "rijāl", ms: "rijal (ilmu perawi)", en: "narrator biographies", dar: "علم تراجم رواة الحديث وأحوالهم.", dms: "Ilmu biografi dan keadaan para perawi hadis.", den: "The science of hadith narrators' biographies and conditions." },
  { ar: "تحمل وأداء", tr: "taḥammul wa adāʾ", ms: "tahammul & ada'", en: "receiving & conveying", dar: "أخذ الحديث وكيفية روايته بعدُ.", dms: "Cara menerima hadis dan cara menyampaikannya semula.", den: "The reception of hadith and the manner of its later conveyance." },
];

export const GLOSSARY = Object.fromEntries(GLOSSARY_DATA.map((g) => [g.ar, g.ms]));
const KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

export function glossaryFor(text) {
  if (!text) return "";
  const hits = [];
  for (const k of KEYS) if (text.includes(k)) hits.push(`${k} = ${GLOSSARY[k]}`);
  return hits.length ? `\nIstilah teknikal (WAJIB guna ejaan ini): ${hits.slice(0, 12).join("; ")}.` : "";
}
