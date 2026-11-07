import type { MetadataRoute } from "next";

/**
 * robots.txt — sebelum ini TIADA langsung.
 *
 * KENAPA PENTING DI SINI: laman ini mempunyai 127,286 muka perawi dan muka
 * carian yang menerima query string. Setiap query string berbeza ialah
 * permintaan baharu ke pangkalan data. Crawler yang menjana query sendiri
 * boleh membuat ribuan carian — dan pada Sep 2026 bacaan Turso mencecah
 * 627,991,252 (126% had) lalu SELURUH akaun disekat.
 *
 * Muka hasil carian dalaman memang tidak sepatutnya diindeks (Google sendiri
 * menasihatkan begitu), jadi menyekatnya tidak merugikan SEO — ia hanya
 * menghentikan crawler daripada membakar kuota pangkalan data.
 *
 * Kandungan sebenar — hadis, perawi, kitab, glosari — kekal terbuka.
 */
/**
 * Crawler alat SEO komersial — mereka mengumpul data untuk pelanggan mereka,
 * bukan menghantar pembaca. 23 Okt 2026: SemrushBot merayap muka kitab/perawi
 * semasa bacaan Turso melonjak ~10 juta sejam. Senarai yang SAMA disekat terus
 * (403) dalam worker.ts untuk yang tidak menghormati robots.txt.
 */
export const SEO_BOTS = [
  "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot",
  "PetalBot", "Barkrowler", "serpstatbot", "SeekportBot", "MegaIndex", "Bytespider",
  // Crawler AI/scraper — disekat 403 dalam worker.ts (AI_BOT_UA)
  "ElevenlabsCrawler", "GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "PerplexityBot", "Amazonbot",
  "meta-externalagent", "Google-Extended", "Diffbot", "ImagesiftBot", "omgili", "Timpibot",
];

const BASE_DISALLOW = [
  "/admin",    // panel pentadbir
  "/api/",     // endpoint dalaman
  "/cari",     // muka carian — setiap query = pertanyaan DB baharu
  "/*?q=",     // sebarang carian melalui query string (cth /hadis?q=…)
  "/*?h=",     // pintasan hadis lama (dialihkan ke ?page=N) — 85k URL unik
  "/*?semua=", // senarai penuh guru/murid perawi — mahal CPU
];

/**
 * Enjin carian utama boleh merayap /perawi/ (SEO kekal). Crawler lain disekat
 * daripada /perawi/: 127k muka × ~220 ms CPU SSR melanggar had 10 ms Worker
 * percuma (docs/worker-cpu/README.md, keputusan "C-separuh" 7 Nov 2026).
 * Crawler memakai kumpulan paling khusus sahaja, jadi BASE_DISALLOW diulang.
 */
export const SEARCH_BOTS = ["Googlebot", "Bingbot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEO_BOTS, disallow: "/" },
      { userAgent: SEARCH_BOTS, allow: "/", disallow: BASE_DISALLOW },
      { userAgent: "*", allow: "/", disallow: [...BASE_DISALLOW, "/perawi/"] },
    ],
  };
}
