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
| Pangkalan data | **Supabase** (Postgres terurus), region Singapore (Southeast Asia). Akses: `supabase-js` (HTTP, sesuai Workers) + pooler untuk migrasi/import |
| App | Next.js 16 → **SSR/ISR via `@opennextjs/cloudflare`** untuk SEO (setiap hadis/perawi = URL boleh-index). Supabase juga benarkan query client-side (RLS) bila perlu |
| Teks hadis AR+EN | **AhmedBaset/hadith-json** (17 kitab, 50,884 hadis) |
| Darjat & isnad | **ceefour/sanad-hadith** (9 kitab, Postgres-ready) |
| Perawi/rijal | **Itqan** (~115k perawi) — utama |
| Graf sanad / keluasan | **Sanadset 650K** (Mendeley — 650,986 rantaian, 926 kitab) |
| Perawi tambahan | Hawramani (135k) — pilihan, perlu scrape |
| Terjemahan BM | Draf AI (deep research) → disahkan pasukan (`is_verified`) |

## 5. Pengesahan sumber data (recon — disahkan)
| Keperluan | Sumber | Status |
|---|---|---|
| Teks hadis AR+EN (kanonik) | AhmedBaset (GitHub) | ✅ ada |
| Darjat + isnad (9 kitab) | ceefour (GitHub, TSV Postgres) | ✅ ada |
| Perawi 100k+ | Itqan: `kaggle_rawis.csv`, `arsanad_narrators.csv`, `external_narrators_db.json` | ✅ ada (dah clone) |
| Graf sanad (926 kitab, 650k) | Sanadset 650K (Mendeley) | ✅ ada (muat turun) |
| Perawi tambahan 135k | Hawramani | ⚠️ laman sahaja, tiada dump/API |

**Nota jujur tentang skala 753k:** angka tepat 753,192 ialah dataset islam-db
sendiri. Dari sumber terbuka kita capai **~650k+ rantaian merentas 926 kitab**
(skala setara/lebih luas) **tanpa scrape**. Padanan tepat 1:1 dengan islam-db
(ID & halaman sama) hanya boleh jika kita ambil data islam-db sendiri.

**Kerja utama = integrasi:** sumber berbeza ada ID/skema/ejaan nama berbeza.
Mencantum perawi yang sama merentas Itqan/Sanadset (entity resolution) dan
memadan hadis antara sumber ialah cabaran kejuruteraan data terbesar projek ini.

## 6. Model dwibahasa kandungan (penting)
Dua lapisan bahasa yang **berbeza**:
- **UI** (nav, label, ayat kita) — tukar penuh ikut bahasa (i18n sedia ada).
- **Kandungan kitab** (matn hadis, nanti bio perawi) — **Arab sentiasa teras**,
  terjemahan jadi pasangan:

| Mod | Papar |
|---|---|
| ع (Arab) | Teks Arab **sahaja** |
| BM | Teks Arab **+** terjemahan Melayu |
| EN | Teks Arab **+** terjemahan Inggeris |

- **Bukan auto-terjemah.** Terjemahan = data tersimpan + disahkan (`translations`).
- **BM:** draf AI ditanda `is_verified=false` → disahkan pasukan → `is_verified=true`.
- **EN:** dari AhmedBaset (terjemahan piawai) — rujukan.

## 7. Pipeline ingestion (berperingkat)
1. **Fasa A:** AhmedBaset → `hadiths.arabic_text` + `translations(en)`; ceefour → `gradings`.
2. **Fasa B:** Itqan → `narrators` + `narrator grades`; Sanadset → `narration_links` (graf sanad); padan perawi (entity resolution).
3. **Fasa C:** draf BM → `translations(ms, is_verified=false)`; pasukan sahkan.
4. Carian Arab: lajur ternormal (buang tashkeel) + indeks trigram/FTS.

## 8. Supabase — setup
1. supabase.com → **New project** → pilih region **Southeast Asia (Singapore)**, set DB password.
2. Ambil dari **Settings**:
   - **API:** Project URL, `anon` key, `service_role` key.
   - **Database:** connection string (guna **pooler/Transaction** untuk serverless; **direct** untuk import pukal/COPY).
3. Jalankan `db/schema.sql` (SQL Editor atau `psql`).
4. **Exposed schemas:** tambah `hadith` (Settings → API) supaya PostgREST/`supabase-js` nampak.
5. **Secrets:** connection string & `service_role` disimpan dalam `.env.local` (di-gitignore) — **jangan commit**.

**⚠️ Saiz/tier:** Supabase Free = **500MB DB**. Korpus penuh (teks 753k + perawi +
graf) akan lebihi ini (anggaran beberapa GB) → perlu **Supabase Pro (8GB)**.
Subset awal (kanonik 9 kitab) muat dalam Free untuk prototaip.

## 9. Status
⏳ Menunggu **Supabase project URL + connection string/keys** untuk jalankan skema
(`db/schema.sql`) + importer.
