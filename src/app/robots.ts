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
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",   // panel pentadbir
          "/api/",    // endpoint dalaman
          "/cari",    // muka carian — setiap query = pertanyaan DB baharu
          "/*?q=",    // sebarang carian melalui query string (cth /hadis?q=…)
        ],
      },
    ],
  };
}
