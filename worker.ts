/**
 * Worker utama — membungkus worker OpenNext dengan cache tepi Cloudflare.
 *
 * KENAPA: semua muka korpus ialah `force-dynamic`, jadi SETIAP paparan (manusia
 * atau crawler) menjadi query Turso. Pada 22–23 Okt 2026 crawler membakar ~10
 * juta bacaan sejam (82.8% had bulanan dalam 3 hari). Query sudah dimurahkan
 * (db/migrations/2026-10-23-bacaan-murah.sql); lapisan ini pula memastikan
 * paparan BERULANG tidak menyentuh pangkalan data langsung.
 *
 * Korpus jarang berubah, jadi respons GET tanpa-sesi dicache TTL jam di setiap
 * pusat data Cloudflare. Kunci cache = URL + bahasa (cookie `lang`) + pengepala
 * RSC Next (navigasi klien mengembalikan payload berlainan untuk URL sama).
 *
 * TIDAK dicache: /admin, /api/auth, sesiapa yang ada cookie sesi admin, bukan-GET,
 * respons bukan-200, dan respons yang menetapkan cookie.
 *
 * Nota: Cache API hanya aktif pada domain tersuai (syaifulizhan.my); di
 * *.workers.dev ia tiada kesan — selamat, cuma tidak dicache.
 */
// @ts-expect-error: dijana oleh `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

const TTL = 7 * 24 * 60 * 60; // 7 hari — suntingan admin kelihatan selewat-lewatnya selepas ini
// Naikkan nilai ini pada deploy untuk membatalkan semua cache tepi (tiada laluan purge lain).
const CACHE_VERSION = "2";
const SESSION_COOKIE = "diz_sess";
const BYPASS = [/^\/admin(\/|$)/, /^\/api\/auth(\/|$)/, /^\/_next\//];
const CACHEABLE_TYPE = /^(text\/html|text\/x-component|application\/json)/;
// Pengepala yang mengubah respons Next untuk URL yang sama.
const VARY = ["rsc", "next-router-prefetch", "next-router-segment-prefetch", "next-router-state-tree", "next-url"];

interface TursoEnv { TURSO_DATABASE_URL?: string; TURSO_AUTH_TOKEN?: string }

const PER_PAGE = 20; // selaras PER_PAGE dalam src/static/templates.mjs

/** Satu SELECT ke Turso melalui HTTP pipeline (tanpa klien libsql/React). Pulang baris pertama atau null. */
async function tursoRow(env: TursoEnv, sql: string, args: number[]): Promise<(string | null)[] | null> {
  const base = (env.TURSO_DATABASE_URL ?? "").replace(/^libsql:\/\//, "https://");
  if (!base.startsWith("https://")) return null;
  try {
    const res = await fetch(`${base}/v2/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.TURSO_AUTH_TOKEN ?? ""}`, "content-type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql, args: args.map((v) => ({ type: "integer", value: String(v) })) } }, { type: "close" }] }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { results?: { response?: { result?: { rows?: { value?: string }[][] } } }[] };
    const row = j.results?.[0]?.response?.result?.rows?.[0];
    return row ? row.map((c) => c?.value ?? null) : null;
  } catch {
    return null;
  }
}

const pageUrl = (origin: string, book: number, seq: number, total: number) => {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const p = Math.min(pages, Math.floor((Math.max(seq, 1) - 1) / PER_PAGE) + 1);
  return `${origin}/kitab/${book}/${p > 1 ? `${p}/` : ""}`;
};

const redirect308 = (location: string) =>
  new Response(null, { status: 308, headers: { location, "cache-control": "public, max-age=86400" } });

/**
 * Lencongan URL lama tanpa React: /x/h/<hadithId>/ (dahulu /kitab/<b>?h=) dan
 * /x/ch/<bookId>/<chapterRef>/ (dahulu ?ch=). Satu query kecil -> halaman statik -> 308.
 * Serpihan #h-<id> dikekalkan oleh pelayar merentas alihan.
 */
async function legacyRedirect(url: URL, env: TursoEnv): Promise<Response | null> {
  const h = url.pathname.match(/^\/x\/h\/(\d{1,12})\/?$/);
  if (h) {
    const row = await tursoRow(env, "SELECT h.book_id, h.seq, COALESCE(b.total_hadith, 0) FROM hadiths h JOIN books b ON b.id = h.book_id WHERE h.id = ?", [Number(h[1])]);
    return redirect308(row ? pageUrl(url.origin, Number(row[0]), Number(row[1]), Number(row[2])) : `${url.origin}/hadis/`);
  }
  const c = url.pathname.match(/^\/x\/ch\/(\d{1,12})\/(\d{1,12})\/?$/);
  if (c) {
    const bid = Number(c[1]);
    const row = await tursoRow(env, "SELECT (SELECT min(first_seq) FROM book_chapter WHERE book_id = ? AND chapter_ref >= ?), (SELECT COALESCE(total_hadith, 0) FROM books WHERE id = ?)", [bid, Number(c[2]), bid]);
    return redirect308(pageUrl(url.origin, bid, Number(row?.[0] ?? 1), Number(row?.[1] ?? 0)));
  }
  return null;
}

interface Ctx { waitUntil(p: Promise<unknown>): void; passThroughOnException?(): void }

function cookie(req: Request, name: string): string | undefined {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m?.[1];
}

async function cacheKey(req: Request): Promise<Request> {
  const url = new URL(req.url);
  const lang = cookie(req, "lang");
  url.searchParams.set("__cv", CACHE_VERSION);
  url.searchParams.set("__lang", lang === "en" || lang === "ar" ? lang : "bm");
  const vary = VARY.map((h) => `${h}=${req.headers.get(h) ?? ""}`).join("&");
  if (vary !== VARY.map((h) => `${h}=`).join("&")) {
    const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(vary));
    url.searchParams.set("__v", [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""));
  }
  return new Request(url.toString(), { method: "GET" });
}

function cacheable(req: Request): boolean {
  if (req.method !== "GET") return false;
  const { pathname } = new URL(req.url);
  if (BYPASS.some((r) => r.test(pathname))) return false;
  if (cookie(req, SESSION_COOKIE)) return false;
  return true;
}

// Selaras dengan SEO_BOTS dalam src/app/robots.ts. Dibalas 403 di sini supaya
// tidak sampai ke Next/Turso langsung; /robots.txt tetap dihidang supaya bot yang
// sopan nampak arahan Disallow dan berhenti sendiri.
const SEO_BOT_UA = /SemrushBot|AhrefsBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|PetalBot|Barkrowler|serpstatbot|SeekportBot|MegaIndex|Bytespider/i;
// Crawler AI/scraper: URL unik (/perawi/<id>/) tidak pernah kena cache tepi, tiap satu bakar CPU Worker.
const AI_BOT_UA = /ElevenlabsCrawler|GPTBot|ClaudeBot|anthropic-ai|CCBot|PerplexityBot|Amazonbot|meta-externalagent|Google-Extended|Diffbot|ImagesiftBot|omgili|Timpibot/i;

const worker = {
  async fetch(request: Request, env: unknown, ctx: Ctx): Promise<Response> {
    let req = request;
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") ?? "";
    if ((SEO_BOT_UA.test(ua) || AI_BOT_UA.test(ua)) && url.pathname !== "/robots.txt") {
      return new Response("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
    }
    // next.config trailingSlash:true → Next jawab 308 ke "/path/"; jawab terus tanpa handler.fetch.
    // Hanya laluan tanpa titik (bukan fail), bukan /_next, /api; GET/HEAD sahaja.
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname !== "/" && !url.pathname.endsWith("/")
      && !url.pathname.includes(".") && !/^\/(_next|api)(\/|$)/.test(url.pathname)) {
      url.pathname += "/";
      return new Response(null, { status: 308, headers: { location: url.toString(), "cache-control": "public, max-age=3600" } });
    }
    if (url.pathname.startsWith("/x/") && (req.method === "GET" || req.method === "HEAD")) {
      const r = await legacyRedirect(url, env as TursoEnv);
      if (r) return r;
      // Carian dalam kitab: /x/kitab/<id>/?s=… ditulis semula ke laluan SSR Next /kitab/<id>/.
      const k = url.pathname.match(/^\/x\/kitab\/(\d{1,12})\/$/);
      if (k) req = new Request(new URL(`/kitab/${k[1]}/${url.search}`, url), req);
    }
    if (!cacheable(req)) return handler.fetch(req, env, ctx);

    const cache = (caches as unknown as { default: Cache }).default;
    const key = await cacheKey(req);
    const hit = await cache.match(key);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set("x-diwan-cache", "HIT");
      res.headers.set("cache-control", "private, no-cache");
      return res;
    }

    const res: Response = await handler.fetch(req, env, ctx);
    if (res.status !== 200 || res.headers.has("set-cookie") || !CACHEABLE_TYPE.test(res.headers.get("content-type") ?? "")) {
      return res;
    }
    const [forCache, forClient] = res.body ? res.body.tee() : [null, null];
    const stored = new Response(forCache, res);
    stored.headers.set("cache-control", `public, max-age=${TTL}`);
    ctx.waitUntil(cache.put(key, stored));

    const out = new Response(forClient, res);
    out.headers.set("x-diwan-cache", "MISS");
    return out;
  },
};

export default worker;
