# Platform Hadis & Sanad — Pelan Seni Bina

Dokumen ini merekod keputusan dan reka bentuk untuk membina semula penjelajah
hadis/sanad (gantian `hadith.islam-db.com`) sebagai sebahagian Zon Ilmu
`syaifulizhan.my`. Disimpan dalam repo supaya kekal merentas sesi.

---

## 1. Tujuan
Selamatkan dan bina semula **موسوعة الحديث** (islam-db) "cara kita" — estetik,
futuristik, mesra pengguna — untuk penjelajahan hadis, sanad, dan biografi perawi.

## 2. Laman rujukan ("kawan baik" — sumber kebenaran istilah)
- Dewan Bahasa dan Pustaka (DBP)
- Kamus Bahasa Melayu–Arab
- Kamus Bahasa Melayu–Inggeris
- _(akan ditambah)_

## 3. Standard bahasa
- **BM pure:** Hadis (bukan Hadith), Dewan (bukan Diwan), perawi, sanad, riwayat, darjat, takhrij.
- **EN:** guna istilah Inggeris (Hadith, narrator, chain of narration, grading).
- **Arab:** ejaan asli (`حديث`, `ديوان`, `سند`).
- Jenama BM = **Dewan Izhan** · Arab kekal `دِيوَان`.

## 4. Keputusan terkumpul
| Perkara | Keputusan |
|---|---|
| Pangkalan data | **Neon** (Postgres serverless), region Singapore. Pemacu `@neondatabase/serverless` (HTTP) untuk Cloudflare Workers |
| App | Next.js 16 → naik taraf **SSR/ISR via `@opennextjs/cloudflare`** (perlu untuk skala + SEO setiap hadis/perawi = URL boleh-index) |
| Sumber teras | **AhmedBaset/hadith-json** (Arab+Inggeris selari, 17 kitab, 50,884 hadis) + **ceefour/sanad-hadith** (darjat & isnad, 9 kitab) |
| Perawi/rijal (Fasa B) | Itqan (115k), Sanadset 650K, Hawramani (135k) |
| Cara dapat data | Dump GitHub dahulu (bukan scrape laman 403) |

## 5. Model dwibahasa kandungan (penting)
Dua lapisan bahasa yang **berbeza**:
- **UI** (nav, label, ayat kita) — tukar penuh ikut bahasa (i18n sedia ada).
- **Kandungan kitab** (matn hadis, nanti bio perawi) — **Arab sentiasa teras**,
  terjemahan jadi pasangan:

| Mod | Papar |
|---|---|
| ع (Arab) | Teks Arab **sahaja** |
| BM | Teks Arab **+** terjemahan Melayu |
| EN | Teks Arab **+** terjemahan Inggeris |

- **Bukan auto-terjemah.** Terjemahan = data tersimpan + disahkan (lihat jadual `translations`).
- **BM:** draf AI (deep research, teliti) ditanda `is_verified=false`, kemudian
  **disahkan pasukan** → `is_verified=true`. Menyokong tujuan silang-semak & kesan
  kesalahan makna.
- **EN:** dari AhmedBaset (terjemahan piawai) — boleh terus dianggap rujukan.

## 6. Pipeline ingestion (ringkas)
1. Import AhmedBaset → `hadiths.arabic_text` + `translations(lang='en')`.
2. Import ceefour → `gradings` + sahkan isnad untuk 9 kitab bertindih (padan ikut `collection` + nombor).
3. Jana draf BM (deep research) → `translations(lang='ms', is_verified=false)`.
4. Carian Arab: simpan lajur ternormal (buang tashkeel) + indeks trigram/FTS.

## 7. Cabaran diketahui
- **Carian Arab:** perlu normalisasi tashkeel/hamzah; FTS Postgres `simple` + `pg_trgm`.
- **Padanan ID** antara AhmedBaset & ceefour (skema penomboran berbeza).
- **Saiz Neon:** 9–17 kitab muat; korpus penuh + perawi nanti besar → mungkin pelan berbayar.

## 8. Status
⏳ Menunggu **connection string Neon** untuk jalankan skema (`db/schema.sql`) + importer.
