import { createClient, type Client } from "@libsql/client";

/**
 * Klien korpus Turso/libSQL — dicipta LAZY (masa request), bukan module-load.
 * Sebab: @opennextjs/cloudflare isi env Worker (TURSO_*) hanya semasa request,
 * jadi membaca process.env di module-load beri URL kosong → URL_INVALID.
 *
 * Dev tempatan : TURSO_DATABASE_URL = file:./data/corpus.db
 * Produksi     : libsql://<db>.turso.io + TURSO_AUTH_TOKEN (Cloudflare secret)
 */
let _client: Client | undefined;

// Env Turso dari getCloudflareContext (KONSISTEN utk page SSR + API route). process.env
// TURSO_* tak dijamin diisi utk route handler @opennextjs/cloudflare → dulu API route
// syarah pulang kosong. getCloudflareContext().env sama macam binding D1 (hadithDb).
async function client(): Promise<Client> {
  if (_client) return _client;
  let url = process.env.TURSO_DATABASE_URL;
  let authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const env = getCloudflareContext().env as unknown as { TURSO_DATABASE_URL?: string; TURSO_AUTH_TOKEN?: string };
      url = env.TURSO_DATABASE_URL;
      authToken = env.TURSO_AUTH_TOKEN;
    } catch { /* bukan konteks Worker (cth skrip Node) */ }
  }
  _client = createClient({ url: url || "file:./data/corpus.db", authToken });
  return _client;
}

// corpus.execute — dapatkan klien (env betul) pada setiap panggilan (dicache selepas pertama).
export const corpus = {
  execute: async (q: string | { sql: string; args?: unknown[] }) => (await client()).execute(q as never),
  batch: async (stmts: unknown[], mode?: string) => (await client()).batch(stmts as never, mode as never),
};

/**
 * Klien HADIS — kini SAMA dengan `corpus` (Turso). Dahulu Cloudflare D1.
 *
 * Kenapa disatukan (26 Ogos 2026): D1 had 500MB dan SUDAH penuh (524MB) →
 * jadual terpaksa dipindah keluar sepotong-sepotong, dan belahan itu jadi punca
 * bug SENYAP. Contoh sebenar: `getSharahForKitab` baca turath_book dari Turso
 * tapi sharh_segment dari D1 — sedangkan sharh_segment sudah di-DROP dari D1
 * (92cb8b0) → query lempar → catch → syarah kosong di laman hidup. turath_page
 * + turath_heading pula hilang terus dari kedua-dua DB. Satu korpus, satu
 * sumber kebenaran, tiada lagi kelas pepijat ini. Turso muat 5GB (guna ~888MB).
 *
 * Dikekalkan sebagai nama berasingan supaya niat kekal terbaca di tempat
 * panggilan (kandungan bacaan lwn perawi/isnad) — dan supaya senang dipisah
 * semula kalau suatu hari perlu.
 */
export const hadithDb = corpus;
