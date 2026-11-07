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
