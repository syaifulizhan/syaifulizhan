// Kongsi antara penjana statik (gen-kitab-static.mjs, gen-perawi-static.mjs):
// sambungan DB, query dengan cuba semula, pengesan CSS Next.
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const ASSETS = ".open-next/assets";
export const STABLE_CSS = "/static-site.css";

/**
 * Sambungan DB. CI hanya ada TURSO_API_TOKEN (sama seperti kuota.yml/segar-seq.mjs):
 * token baca-sahaja 1 jam dijana di sini, jadi tiada rahsia DB tambahan di GitHub.
 * Di CI (env CI=true) tanpa sebarang kelayakan → gagal, jangan deploy laman kosong.
 */
export async function connect() {
  const env = process.env;
  if (env.TURSO_DATABASE_URL) return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  if (env.TURSO_API_TOKEN) {
    const org = env.TURSO_ORG || "syaifulizhan-thgzut";
    const name = env.TURSO_DB || "dewan-izhan-v3";
    const api = async (path, init = {}) => {
      const r = await fetch(`https://api.turso.tech/v1/organizations/${org}/databases/${name}${path}`, {
        ...init, headers: { Authorization: `Bearer ${env.TURSO_API_TOKEN}` },
      });
      if (!r.ok) throw new Error(`Turso API ${path}: HTTP ${r.status}`);
      return r.json();
    };
    const { database } = await api("");
    const { jwt } = await api("/auth/tokens?expiration=1h&authorization=read-only", { method: "POST" });
    return createClient({ url: `libsql://${database.Hostname}`, authToken: jwt });
  }
  if (env.CI) throw new Error("gen-kitab-static: no Turso credentials in CI (set TURSO_API_TOKEN)");
  return createClient({ url: "file:./data/corpus.db" });
}
export const db = await connect();
export const REMOTE = !String(db.protocol ?? "").startsWith("file");
export const CONCURRENCY = REMOTE ? 4 : 8;

/** Ralat sementara (aliran HTTP Turso/rangkaian) yang berbaloi dicuba semula. */
const TRANSIENT = /SERVER_ERROR|HTTP status [45]\d\d|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|network|stream|timed? ?out/i;
const BACKOFF_MS = [1000, 3000, 9000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let retries = 0;
export const retryCount = () => retries;
/** Satu execute dengan 3 cubaan semula (1s/3s/9s); selepas itu gagal keras. "no such table" tidak dicuba semula. */
export const rows = async (sql, args = []) => {
  for (let attempt = 0; ; attempt++) {
    try { return (await db.execute({ sql, args })).rows; }
    catch (e) {
      const msg = String(e?.message ?? e);
      if (attempt >= BACKOFF_MS.length || /no such table/i.test(msg) || !TRANSIENT.test(msg)) throw e;
      retries++;
      console.warn(`cuba semula ${attempt + 1}/${BACKOFF_MS.length} (${msg.slice(0, 80)})`);
      await sleep(BACKOFF_MS[attempt]);
    }
  }
};
/** Jadual pilihan (cth override sanad) mungkin tiada: HANYA "no such table" dikosongkan; ralat lain dilempar. */
export const rowsSafe = async (sql, args = []) => {
  try { return await rows(sql, args); }
  catch (e) { if (/no such table/i.test(String(e?.message ?? e))) return []; throw e; }
};
export const group = (list, key) => {
  const m = new Map();
  for (const r of list) { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
};

export function cssHrefs() {
  const root = join(ASSETS, "_next/static");
  if (!existsSync(root)) throw new Error(`${root} tiada — jalankan opennextjs-cloudflare build dahulu`);
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css") && /\.hcard|\.pwrap/.test(readFileSync(p, "utf8"))) found.push("/" + relative(ASSETS, p));
    }
  };
  walk(root);
  if (!found.length) throw new Error("CSS Next (.hcard/.pwrap) tidak ditemui");
  // Laluan STABIL: nama fail Next berhash berubah pada deploy kod-sahaja dan akan menyahsahkan cache aset statik.
  // Gabung (tertib) ke satu fail tetap; halaman statik & worker merujuk ini sahaja.
  const css = found.sort().map((h) => readFileSync(join(ASSETS, h), "utf8")).join("\n");
  const badUrl = [...css.matchAll(/url\(\s*(['"]?)([^)'"]*)/g)].some((m) => !/^(data:|https?:|\/)/.test(m[2]));
  if (badUrl || /@import/.test(css)) throw new Error("CSS Next mengandungi url()/@import relatif — laluan stabil tidak selamat");
  writeFileSync(join(ASSETS, STABLE_CSS.slice(1)), css);
  return [STABLE_CSS];
}


/** Banyak penyataan dalam SATU perjalanan HTTP (read), dengan cuba semula yang sama seperti rows(). */
export const batchRows = async (stmts) => {
  for (let attempt = 0; ; attempt++) {
    try { return (await db.batch(stmts, "read")).map((r) => r.rows); }
    catch (e) {
      const msg = String(e?.message ?? e);
      if (attempt >= BACKOFF_MS.length || !TRANSIENT.test(msg)) throw e;
      retries++;
      console.warn(`cuba semula batch ${attempt + 1}/${BACKOFF_MS.length} (${msg.slice(0, 80)})`);
      await sleep(BACKOFF_MS[attempt]);
    }
  }
};

/** Senarai CSS untuk Worker (worker.ts mengimport fail ini semasa bundle `wrangler deploy`). */
export const writeCssManifest = (hrefs) => writeFileSync(".open-next/css-hrefs.json", JSON.stringify(hrefs));
