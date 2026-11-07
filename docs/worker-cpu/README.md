# Worker CPU — had 10 ms pelan percuma Cloudflare

Status: aktif (dikemas kini 2026-11-07). Pemilik memutuskan: **selesaikan secara percuma, tanpa naik taraf Workers Paid**.

## Gejala
Pada 2026-11-07, Cloudflare menghantar emel yang menyatakan Worker melanggar had CPU percuma lebih 1,000 kali dalam 24 jam. Worker terlibat ialah `dewan-izhan` dalam akaun G-45550141. Statistik 24 jam: 24.9k permintaan, 6.7k ralat, median CPU 14.3 ms.

## Kenapa berlaku (punca berlapis)
1. **SSR penuh untuk setiap paparan.** Laluan `perawi/[id]`, `kitab/[id]`, `hadis`, `glosari` dan `cari` ditanda `force-dynamic`. Tiada `revalidate`, tiada `generateStaticParams`, dan tiada cache tambahan (incremental cache) OpenNext.
2. **Kos asas Next/React SSR di Worker jauh melebihi 10 ms.** Ukuran selepas pembaikan pertama: perawi 200–420 ms, kitab 50–250 ms. Had percuma ialah 10 ms, jadi seni bina ini memang tidak muat dengan had tersebut.
3. **Ruang URL yang sangat besar.** Korpus mengandungi 127k perawi dan 85k hadis dalam 942 kitab. Pautan `?h=<hadis>` di halaman kitab menjadikan setiap hadis satu URL unik yang memaparkan halaman yang hampir sama.
4. **Cache tidak membantu crawler.** Cache API berfungsi per pusat data, TTL 6 jam, dan kuncinya ialah URL penuh. Crawler membuka setiap URL sekali sahaja, jadi setiap permintaan menjadi MISS dan memaparkan SSR penuh.
5. **Crawler.** Antaranya ElevenlabsCrawler (AI), crawler rangkaian Apple (UA Safari) dan Claude-SearchBot. Halaman ini wujud sejak 2026-06-21. Isu Turso pada 23 Okt berpunca daripada perkara yang sama, tetapi waktu itu hanya bacaan DB dibaiki, bukan CPU.

## Sudah dibuat
Rujuk commit `3862d8c` (deploy melalui `.github/workflows/deploy.yml`):
- Senarai guru dan murid dihadkan kepada 100. Lajur `bio_ar` tidak lagi diambil. Paparan penuh di `?semua=1` ditanda noindex dan disekat dalam robots.
- `worker.ts`: crawler AI dibalas 403, dan lencongan 308 trailing-slash dibalas tanpa SSR (~0 ms).
- Papan pemuka: Bot Fight Mode dihidupkan. AI Crawl Control "Training" = Disallow.

## Pilihan percuma (dinilai)
| # | Pilihan | Kesan CPU | Kos/risiko |
|---|---|---|---|
| A | Tukar `?h=` → pautan bab + `#anchor`, canonical, robots `Disallow /*?h=` | URL kitab menurun daripada ~85k kepada bilangan bab | Rendah; pautan lama dilencongkan |
| B | TTL cache 6 j → 7 hari + `CACHE_VERSION` dalam kunci | Lebih banyak HIT untuk manusia | Suntingan admin lambat kelihatan, kecuali versi dinaikkan |
| C | Sekat `/perawi/` untuk crawler (robots) + 1 peraturan WAF rate-limit percuma | Trafik crawler perawi hampir sifar | SEO perawi hilang (keputusan pemilik) |
| D | Laluan perawi/kitab dipapar terus dalam `worker.ts` (templat HTML ringan, tanpa Next/React) | Dijangka 2–10 ms | Reka bentuk berganda; kerja sederhana |
| E | Data statik: JSON dipecah kepada ≤20k fail aset (aset = 0 CPU) + render di klien | ~0 ms di Worker | Bergantung pada render JS untuk SEO; build lebih panjang |
| F | Incremental cache OpenNext ke R2/KV | Cache global | KV free hanya 1k tulis/hari; R2 perlukan kad. Ditolak buat masa ini |
| G | Pra-jana statik semua halaman | 0 ms | 127k+ fail melebihi had 20k aset percuma. Ditolak |
| H | Workers Paid (USD 5/bln) | Selesai serta-merta | Tidak percuma. Ditolak oleh pemilik |

## Keputusan
- Fasa 1 (sekarang): A + B. Murah dan tiada kesan SEO.
- Fasa 2 (jika ralat masih > ~1%/hari): D untuk `/perawi/[id]` dan `/kitab/[id]`. Ini satu-satunya cara supaya CPU setiap permintaan hampir dengan 10 ms.
- C-separuh (dipilih pemilik 2026-11-07): robots membenarkan Googlebot + Bingbot sahaja di `/perawi/`; crawler lain Disallow. Jika crawler Apple (UA Safari) tidak patuh → peraturan WAF percuma ikut ASN pada `/perawi/`.
- Ukuran selepas `db9fcc7`: kitab 308 median 13 ms, kitab 200 median 53 ms, perawi 200 median 220 ms.

## Cara ukur
```
CLOUDFLARE_ACCOUNT_ID=c215b16aa228f4d526bcfbacc4accace npx wrangler@4 tail dewan-izhan --format json
```
Ambil medan `cpuTime` dan `outcome` (exceededCpu). Papan pemuka Workers & Pages memaparkan permintaan, ralat dan median CPU.

## Keputusan 2026-11-07 — sasaran 50k manusia/hari (corak SKTD)
Pemilik meluluskan pelaksanaan penuh. Matlamat: selamat, berkesan, kekal dengan misi asal ("ilmu yang boleh disemak", BM/EN/AR), dan percuma.
- **Statik (aset, tanpa Worker):** halaman kitab `/kitab/<id>/<n>/` (~4.3k), 10k perawi teratas (ikut bilangan rujukan isnad), `/`, `/hadis/`, `/perawi/`, `/glosari/`, cangkerang `/cari/`, 404. Jumlah mesti ≤ 19k fail (build gagal jika lebih).
- **Worker tanpa Next (templat ringan dalam `worker.ts`):** perawi lain (`/x/perawi/<id>`), `/api/*` (carian, bab, syarah), lencongan URL lama. **Admin** kekal Next SSR.
- **Bahasa:** HTML yang sama untuk semua bahasa. Label BM/EN/AR dipancarkan sekali gus, dan CSS `html[data-lang]` memilih yang dipaparkan. Skrip kecil dalam `<head>` membaca cookie `lang`. Tiada prefix URL.
- **Build:** `generateStaticParams` + `scripts/emit-static.mjs` menyalin HTML pra-render ke `.open-next/assets`. `run_worker_first` = `/api/*`, `/admin/*`, `/x/*`.
- **Anggaran:** 200k paparan/hari → ~66k permintaan Worker (had 100k). CPU pengendali terus dijangka 2–6 ms.
- **Fasa:** 1 kitab → 2 perawi → 3 carian/API. Setiap fasa disemak penyemak dan diukur dengan `wrangler tail`. Rollback: `wrangler rollback`.
- Prefetch `next/link` dimatikan seluruh laman (`src/components/Link.tsx`, commit 1ebba8d).

## Fasa 2 — perawi (2026-11-07)
- `scripts/gen-perawi-static.mjs` (selepas gen-kitab-static): 10,000 perawi teratas ikut rujukan isnad (JOIN narrators) → `.open-next/assets/perawi/<id>/index.html`. Gagal keras jika < 9,000 halaman (tanpa `STATIC_PERAWI_LIMIT`). Kod DB/cuba-semula dikongsi dalam `scripts/lib/static-common.mjs`; CSS berhash ditulis ke `.open-next/css-hrefs.json` untuk Worker.
- Templat `perawiPage` + `PERAWI_SQL` dalam `src/static/templates.mjs`, dipakai penjana dan `worker.ts`. Perawi lain (tiada aset) jatuh ke Worker: `/perawi/<id>/` dan `/x/perawi/<id>/[?semua=1]` → satu permintaan pipeline Turso (4 SELECT) + templat, cache tepi 7 hari. Ralat DB → 503 tanpa cache.
- Cadangan pembetulan perawi: `entity_type=narrator` melalui `/api/suggest/` (`data-e`/`data-f` pada `.suggest`).
- Semua pautan perawi ialah `<a href="/perawi/<id>/">` biasa.

## Senarai berhalaman + penapis nama (2026-11-07)
Had `EDGE_LIMIT_ALL` (1000) dan `?semua=1` dibuang: 56 perawi mempunyai >1000 relasi (maks 5,162) dan data mesti boleh disemak.
- URL: `/x/perawi/<id>/senarai/?jenis=murid|guru&p=N&q=<nama>` — `LIST_PER`=250/halaman (had CPU), susunan tahun wafat, jumlah sebenar dipaparkan. `/x/perawi/<id>/?semua=1` → 308 ke senarai murid. Noindex (q → nofollow); `/x/` sudah disekat robots.
- Pengesahan: `id` `\d{1,12}`; `jenis` senarai putih (`LIST_KIND`); `p` integer 1..ceil(total/LIST_PER), di luar julat → 404 (jumlah 0 membenarkan p=1); `q` dipotong 100 aksara.
- Penapis: `nameFilter()` menormalkan dengan `normalizeArabic` (sama seperti carian perawi), buang semua selain huruf Arab, lalu `"tok"*` (frasa FTS berawalan) → `id IN (SELECT rowid FROM narrators_fts WHERE narrators_fts MATCH ?)`. Petikan/operator/HTML/SQL tidak boleh sampai ke MATCH. q tanpa huruf Arab = tiada penapis.
- Cache tepi: kunci = path + jenis + p + q ternormal; 200 → 7 hari, 404 → 1 jam, 503 tidak dicache. Satu pipeline Turso (3 SELECT: kepala, COUNT, baris).
- Pembantu boleh guna semula:
  - `src/static/templates.mjs`: `pagedList({items, render, total, page, per, baseUrl, query, labels})`, `pager(page, totalPages, href)`, `filterForm({action, hidden, q, labels})` (borang GET tanpa JS); `perawiListPage` ialah contoh.
  - `src/static/paged-route.ts`: `parsePage`, `nameFilter`, `loadPage({query, head, count, rows, per, page})` → `ok|notfound|range|unavailable`, `cachedResponse({req, url, ctx, version, ttl, parts, build})`, `unavailable()`. Senarai baharu (hadis, glosari) = tulis SQL `count`/`rows`, panggil `loadPage`, render dengan `pagedList`, bungkus dengan `cachedResponse`; contoh: `perawiListResponse` dalam `worker.ts`.
- Risiko diketahui: setiap `q` unik ialah MISS (1 permintaan Turso, 3 SELECT); dihadkan oleh robots, bot 403 dan WAF.

### Lapisan statik senarai (tanpa Turso/Worker)
- `gen-perawi-static.mjs` menjana `perawi/<id>/senarai.json` ({t,s}: guru/murid sebagai `[id,nama,wafat]`, susunan SQL) untuk SEMUA perawi >100 guru ATAU murid (1,119 fail, maks 362 KB, purata 26.5 KB; jumlah aset 16,917 ≤ 19,000). Bilangan setiap senarai disahkan dengan COUNT; tidak sepadan = build gagal.
- `public/static-senarai.js` (dimuat hanya pada halaman perawi yang terpotong; `.pgraph[data-senarai]`) menaik taraf pautan "Papar semua": muat JSON sekali, senarai 250/halaman + tapis nama dalam pelayar (salinan tepat `normalizeArabic`, awalan token = setara FTS `"tok"*`). Semua teks guna `textContent`. Tanpa JS, pautan `/x/perawi/<id>/senarai/` (Worker) kekal.
