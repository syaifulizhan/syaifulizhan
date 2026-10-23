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

const TTL = 6 * 60 * 60; // 6 jam — suntingan admin kelihatan selewat-lewatnya selepas ini
const SESSION_COOKIE = "diz_sess";
const BYPASS = [/^\/admin(\/|$)/, /^\/api\/auth(\/|$)/, /^\/_next\//];
const CACHEABLE_TYPE = /^(text\/html|text\/x-component|application\/json)/;
// Pengepala yang mengubah respons Next untuk URL yang sama.
const VARY = ["rsc", "next-router-prefetch", "next-router-segment-prefetch", "next-router-state-tree", "next-url"];

interface Ctx { waitUntil(p: Promise<unknown>): void; passThroughOnException?(): void }

function cookie(req: Request, name: string): string | undefined {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m?.[1];
}

async function cacheKey(req: Request): Promise<Request> {
  const url = new URL(req.url);
  const lang = cookie(req, "lang");
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

const worker = {
  async fetch(req: Request, env: unknown, ctx: Ctx): Promise<Response> {
    if (SEO_BOT_UA.test(req.headers.get("user-agent") ?? "") && new URL(req.url).pathname !== "/robots.txt") {
      return new Response("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });
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
