// Crawler beradab untuk pengarsipan islam-db.com.
// UA jelas + hubungan, retry/backoff utk 429/5xx, hormati kelajuan.
export const UA =
  "DewanIzhanArchiver/1.0 (+preservation of abandoned islam-db.com; contact g-45550141@moe-dl.edu.my)";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ambil HTML satu URL dengan retry/backoff.
 * @returns {Promise<{status:number, html:string|null}>}
 */
export async function fetchHtml(url, { retries = 4, baseDelay = 1000 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "ar,en;q=0.8" },
        redirect: "follow",
      });
      if (res.status === 404) return { status: 404, html: null };
      if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
      if (!res.ok) return { status: res.status, html: null };
      return { status: 200, html: await res.text() };
    } catch (e) {
      lastErr = e;
      attempt++;
      if (attempt > retries) break;
      await sleep(Math.min(30000, baseDelay * 2 ** attempt) + Math.random() * 400);
    }
  }
  throw lastErr;
}
