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
