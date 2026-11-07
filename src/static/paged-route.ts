// Pembantu Worker generik: senarai berhalaman + penapis nama + cache tepi. Dipakai /x/perawi/<id>/senarai/;
// boleh dipakai semula untuk senarai lain (hadis, glosari) — lihat docs/worker-cpu/README.md.
// Tiada kebergantungan pada Next/React; `query` disuntik supaya mudah diuji.
import { normalizeArabic } from "../lib/arabic";

export type Row = Record<string, string | number | null>;
export interface Stmt { sql: string; args: (number | string)[] }
/** Beberapa SELECT dalam satu pusingan. null = ralat DB (503, jangan cache). */
export type QueryFn = (stmts: Stmt[]) => Promise<Row[][] | null>;
interface Ctx { waitUntil(p: Promise<unknown>): void }

export const Q_MAX = 100;
const FTS_TOKENS = 8;
export const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

/** p: tiada → 1; selainnya integer 1..999999 (rentetan ketat). Tidak sah → null. */
export function parsePage(raw: string | null): number | null {
  if (raw === null) return 1;
  return /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : null;
}

/**
 * Penapis nama. Input dipotong kepada Q_MAX, dinormalkan dengan normalizeArabic (sama seperti carian perawi:
 * hanya huruf Arab + ruang tinggal), jadi tanda petikan, operator FTS (AND/OR/NOT/NEAR/*), HTML dan SQL tidak
 * boleh sampai ke MATCH. Setiap token dipetik sebagai frasa FTS dan diberi awalan (`"tok"*`), seperti searchNarrators.
 * `norm` = nilai kanonik untuk kunci cache dan medan borang; `match` null = tiada penapis.
 */
export function nameFilter(raw: string | null): { norm: string; match: string | null } {
  const tokens = normalizeArabic((raw ?? "").slice(0, Q_MAX)).split(" ").filter(Boolean).slice(0, FTS_TOKENS);
  return tokens.length ? { norm: tokens.join(" "), match: tokens.map((t) => `"${t}"*`).join(" ") } : { norm: "", match: null };
}

export type PageResult =
  | { kind: "unavailable" }
  | { kind: "notfound" }
  | { kind: "range" }
  | { kind: "ok"; head: Row | null; total: number; rows: Row[] };

/**
 * Satu pipeline: [head?, count, rows]. head tiada baris → notfound; p di luar 1..ceil(total/per) → range
 * (total=0 membenarkan p=1 sahaja, halaman kosong yang sah).
 */
export async function loadPage(o: { query: QueryFn; head?: Stmt; count: Stmt; rows: (offset: number, limit: number) => Stmt; per: number; page: number }): Promise<PageResult> {
  const res = await o.query([...(o.head ? [o.head] : []), o.count, o.rows((o.page - 1) * o.per, o.per)]);
  if (!res) return { kind: "unavailable" };
  const head = o.head ? (res[0][0] ?? null) : null;
  if (o.head && !head) return { kind: "notfound" };
  const i = o.head ? 1 : 0;
  const total = Number(res[i][0]?.total ?? 0);
  if (o.page > Math.max(1, Math.ceil(total / o.per))) return { kind: "range" };
  return { kind: "ok", head, total, rows: res[i + 1] };
}

export const unavailable = () => new Response("Service Unavailable", { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } });

/**
 * Cache tepi mengikut path + `parts` (param sah sahaja — query rawak tidak boleh memintas cache).
 * 200 → ttl; 404 → 1 jam; lain-lain (503) tidak dicache.
 */
export async function cachedResponse(o: { req: Request; url: URL; ctx: Ctx; version: string; ttl: number; parts: Record<string, string | number>; build: () => Promise<Response> }): Promise<Response> {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const k = new URL(o.url.pathname, o.url);
  for (const [name, v] of Object.entries(o.parts)) if (v !== "") k.searchParams.set(name, String(v));
  k.searchParams.set("__cv", o.version);
  const key = new Request(k.toString(), { method: "GET" });
  let res = await cache.match(key);
  if (res) {
    res = new Response(res.body, res);
    res.headers.set("x-diwan-cache", "HIT");
  } else {
    res = await o.build();
    const ttl = res.status === 200 ? o.ttl : res.status === 404 ? 3600 : 0;
    if (ttl) o.ctx.waitUntil(cache.put(key, new Response(res.clone().body, { status: res.status, headers: { ...HTML_HEADERS, "cache-control": `public, max-age=${ttl}` } })));
    res.headers.set("x-diwan-cache", "MISS");
  }
  return o.req.method === "HEAD" ? new Response(null, res) : res;
}
