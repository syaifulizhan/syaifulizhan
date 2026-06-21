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

function client(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL || "file:./data/corpus.db";
    _client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return _client;
}

// Proxy supaya `corpus.execute(...)` kekal berfungsi, tapi klien dicipta pada guna pertama.
export const corpus = new Proxy({} as Client, {
  get(_t, prop) {
    const c = client();
    const v = Reflect.get(c as object, prop);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
