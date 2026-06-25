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

/**
 * Klien HADIS — Cloudflare D1 (matn + terjemahan). Korpus dibahagi: D1 utk
 * kandungan bacaan (berubah kerap), Turso utk perawi/isnad (stabil). Binding "DB"
 * (wrangler.toml) hanya wujud masa request di Worker → dicapai lazy.
 */
type Row = Record<string, unknown>;
interface D1Stmt { bind: (...a: unknown[]) => D1Stmt; all: () => Promise<{ results?: Row[] }> }
interface D1DB { prepare: (sql: string) => D1Stmt }
type ExecArg = string | { sql: string; args?: unknown[] };

async function d1Execute(q: ExecArg): Promise<{ rows: Row[] }> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const env = getCloudflareContext().env as unknown as { DB: D1DB };
  const sql = typeof q === "string" ? q : q.sql;
  const args = (typeof q === "string" ? [] : q.args) ?? [];
  const r = await env.DB.prepare(sql).bind(...args).all();
  return { rows: r.results ?? [] };
}

export const hadithDb = { execute: d1Execute };
