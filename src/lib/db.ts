import { createClient, type Client } from "@libsql/client";

/**
 * Klien korpus Turso/libSQL.
 *
 * Dev tempatan : TURSO_DATABASE_URL = file:./data/corpus.db  (tiada token)
 * Produksi     : TURSO_DATABASE_URL = libsql://<db>.turso.io + TURSO_AUTH_TOKEN
 *
 * Korpus ini baca-sahaja dari sudut app (scrape/import dibuat oleh skrip Node).
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:./data/corpus.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

declare global {
  // elak cipta banyak klien semasa HMR dev
  var __corpus__: Client | undefined;
}

export const corpus: Client =
  globalThis.__corpus__ ?? createClient({ url, authToken });

if (process.env.NODE_ENV !== "production") globalThis.__corpus__ = corpus;
