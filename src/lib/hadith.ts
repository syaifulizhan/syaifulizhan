import type { Hadith, Lang } from "./types";

export const HADITH: Hadith[] = [
  {
    label: { bm: "Hadith Niat", en: "Hadith of Intention", ar: "حديث النيَّة" },
    ar: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    tr: {
      bm: '"Sesungguhnya amalan bergantung pada niat, dan setiap orang memperoleh apa yang diniatkannya."',
      en: '"Verily, actions are by intentions, and every person shall have what they intended."',
      ar: '"إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ" — مبدأٌ جامعٌ للشريعة.',
    },
    grade: {
      bm: "Sahih · Muttafaq ʿalaih",
      en: "Authentic · Agreed Upon",
      ar: "صحيح · متَّفق عليه",
    },
    takhrij: "al-Bukhārī (1) · Muslim (1907)",
    chain: [
      { nm: "ﷺ النَّبِيّ", role: "Rasulullah ﷺ", type: "prophet" },
      { nm: "عُمَر بن الخطّاب", role: "Sahabi" },
      { nm: "عَلْقَمة بن وقّاص الليثي", role: "Tābiʿī · thiqah" },
      { nm: "محمد بن إبراهيم التَّيْمي", role: "Tābiʿī · thiqah" },
      { nm: "يحيى بن سعيد الأنصاري", role: "thiqah thabt" },
      { nm: "سُفيان بن عُيَيْنة", role: "Imam · hāfiz" },
      { nm: "الحُمَيْدي عبد الله بن الزُّبير", role: "thiqah hāfiz" },
      { nm: "الإمام البخاري", role: "Mukharrij", type: "collector" },
    ],
  },
  {
    label: { bm: "Rukun Islam", en: "Pillars of Islam", ar: "أركان الإسلام" },
    ar: "بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّداً رَسُولُ اللَّهِ…",
    tr: {
      bm: '"Islam dibina atas lima perkara: penyaksian bahawa tiada tuhan melainkan Allah dan Muhammad itu Rasul-Nya…"',
      en: '"Islam is built upon five: the testimony that there is no god but Allah and that Muhammad is His Messenger…"',
      ar: '"بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ" — أصلٌ من أصول الشريعة.',
    },
    grade: {
      bm: "Sahih · Muttafaq ʿalaih",
      en: "Authentic · Agreed Upon",
      ar: "صحيح · متَّفق عليه",
    },
    takhrij: "al-Bukhārī (8) · Muslim (16)",
    chain: [
      { nm: "ﷺ النَّبِيّ", role: "Rasulullah ﷺ", type: "prophet" },
      { nm: "عبد الله بن عُمَر", role: "Sahabi" },
      { nm: "عِكْرِمة بن خالد", role: "Tābiʿī · thiqah" },
      { nm: "حَنْظَلة بن أبي سُفيان", role: "thiqah" },
      { nm: "عُبيد الله بن موسى", role: "thiqah" },
      { nm: "الإمام البخاري", role: "Mukharrij", type: "collector" },
    ],
  },
];

export const FOR_SEGS: Record<Lang, string[]> = {
  bm: [
    "Masjid & surau",
    "Sekolah & pondok",
    "Duʿat & pencipta konten",
    "Pertubuhan Islam",
  ],
  en: [
    "Mosques",
    "Schools & pondok",
    "Content creators & duʿāt",
    "Islamic organisations",
  ],
  ar: ["المساجد", "المدارس والمعاهد", "الدعاة وصنَّاع المحتوى", "المؤسسات الإسلامية"],
};
