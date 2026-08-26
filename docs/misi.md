# Senarai Misi — Dīwān Izhan

> Perkara yang **belum siap**, disusun ikut tema. Tick bila selesai.
> Status siap & sejarah krisis: [`corpus-rescue-status.md`](./corpus-rescue-status.md).
> Senibina: [`hadith-platform.md`](./hadith-platform.md).
> Dibuka: **26 Ogos 2026** (audit selepas repo sunyi sejak 5 Ogos).

---

## A. Infra & data (sedang jalan)

- [x] ✅ **A1. Migrasi D1 → Turso — SELESAI 26 Ogos 2026.** `dewan-izhan-v2`
      hidup, laman disahkan, **kos 0 rows_written**. Turso kini 1 DB sahaja
      (`dewan-izhan` lama dipadam selepas disahkan subset tegas).
- [x] ~~A1 (asal)~~ **Migrasi D1 → Turso** — satukan korpus dalam satu DB (kuota Turso baharu
      direnew Ogos; D1 penuh 524/500MB). Cap tulisan peribadi **9.5M/10M**.
      Kaedah: seed `--from-file` (upload fail, bukan INSERT baris) — elak ulangan
      kesalahan lama (DROP+reinsert 1.4M×11 = 15.7M writes → akaun diblok).
      **Disahkan empirik 26 Ogos: seed 50k baris + indeks → `rows_written` kekal 0.**
      Audit D1 vs lokal (26 Ogos): `corpus.db` ialah **superset tegas** — `hadiths`,
      `translations`, `books`, `hadith_bab` cap-jari sama tepat; `glossary` lokal +12;
      `hadith_ruling` D1-sahaja **0** (lebihan 992 D1 = 1,000 pendua kerana D1 tiada
      constraint UNIQUE, tolak 8 baris lokal-sahaja); `hadith_sanad_override` lebihan
      D1 = baris ujian (`edited_by='test'`). Jadi seed terus dari `corpus.db`, tiada
      gabungan diperlukan. Skrip: `build-unified-corpus.py` + `verify-unified.mjs`.
- [x] ✅ **A2. Syarah kosong — PULIH 26 Ogos.** `/api/syarah?book=900003&kitab=1`
      dari `{"segs":[]}` (11 bait) → **367 KB**; Nawawi/Muslim 1.63 MB.
      Bukan data hilang: `sharh_segment` (9,277) selamat di Turso. Bugnya
      `src/lib/hadis.ts:277` — `turath_book` dibaca dari **Turso** tetapi
      `sharh_segment` dari **`hadithDb` (D1)**, sedangkan commit `92cb8b0` sudah
      DROP jadual itu dari D1. Query lempar → `catch → return null` → `segs: []`.
      **Sembuh automatik bila A1 selesai** (satu DB, `hadithDb` = `corpus`).
- [x] ✅ **A2b. `turath_page` + `turath_heading` PULIH** — kini hidup dalam v2.
- [ ] ~~(asal)~~ `turath_page` (30,785) + `turath_heading` (2,532) HILANG dari live —
      hanya wujud dalam `corpus.db` lokal; di-DROP dari D1 dan tak pernah masuk
      Turso. Pembaca teks-penuh syarah (`getSharahPages`) mati senyap di laman
      hidup. Juga sembuh oleh A1.
- [ ] **A3. Rotate kunci** Supabase/Turso yang pernah terdedah dalam chat — belum
      disahkan dibuat. (Warisan; buat sekali dengan A1 sebab secret CF akan dikemas.)
- [ ] **A4. Buang D1 `dewan-hadis`** — kini TIDAK DIGUNAKAN oleh kod (kekal utuh
      sebagai sandaran kandungan). Tunggu beberapa kitaran deploy, kemudian
      buang binding `[[d1_databases]]` dari `wrangler.toml` + DROP DB.
- [ ] **A5. Padam `probe-fromfile` di Turso** — DB ujian kosong; API Turso pulang
      `internal server error` pada 5 cubaan (CLI + REST). Bug sebelah mereka;
      padam dari dashboard. Tiada kesan kuota (0 writes, 0 storan).

## B. Kelengkapan korpus (jurang terbesar)

- [ ] **B1. Scrape islam-db perawi tergantung** — berhenti pada had lalai
      `--to=42517` (25,072 ok · 17,445 missing · 94 gagal), BUKAN habis.
      Perlu probe max ID sebenar dahulu. Matlamat 100k+.
- [ ] **B2. Scrape islam-db hadis tergantung** — berhenti `book=1422`, 9,603 hadis
      sahaja, hasil ~10/kitab. **Siasat parser dahulu** — disyaki tercicir bab/hadis
      sebelum sambung. 824 gagal perlu `retry-failed.mjs`.
- [ ] **B3. 894/942 kitab masih stub** (≤10 hadis) + ~30 separa. Ikut PRINSIP RIWAYAT:
      satu tajuk boleh ada banyak riwayat (Muwatta 3+) — ambil riwayat SPESIFIK,
      jangan gabung.
- [ ] **B4. `authors` & `topics` KOSONG (0 baris)** — `books.author_id`/`topic_id`
      tergantung; hanya 16/942 buku ada `author_ar`; `total_hadith` semua NULL.
- [ ] **B5. Hawramani fasa B** — parse bio HTML (~38KB/perawi, jarh-ta'dil dari 62
      kitab). Indeks 100,915 siap; bio baru ~58.
- [ ] **B6. Jurang Itqan** 114k → 102,783 (~11k) belum disiasat.
- [ ] **B7. `hadith_narrators` yatim** 4,262 baris (id islam-db tak wujud) + ~5k tepi
      graf yatim → NULL-kan/padam.
- [ ] **B8. 12 entri glosari lokal** belum sync D1 (`glossary-d1-sync.sh`).

## C. Terjemahan

- [ ] **C1. BM tulen: 873/85,503 (1.0%)** — misi terbengkalai. EN ada 47,450
      (AhmedBaset). Bulk Gemini belum jalan; kualiti perlu tune dahulu.

## D. Pemautan isnad (amanah > laju)

- [ ] **D1. Liputan pemautan ~42%** — naik SECARA TEPAT perlu: (a) lebih profil
      perawi (B1/B5), (b) nama relational ابيه/ابي via nasab (iteratif —
      `link-relational.mjs` selepas setiap fasa), (c) pengesah otoritatif
      sunna.alifta.gov.sa (Angular SPA — API belum dijumpai, CDP disekat).
- [ ] **D2. Re-parse korpus dengan parser v3** (struktur tahwil) — delta rowid tak
      boleh guna kalau struktur berubah.
- [ ] **D3. Sync pemautan ke Turso** — live masih data lama. Guna
      `turso-delta-hn.mjs` (UPDATE baris berubah sahaja), BUKAN full-resync
      (~265k–700k writes).

## E. Keputusan pemilik (blocking — kerja tak boleh sambung tanpa ini)

- [ ] **E1. Raqm al-hadis — pilih satu:**
      **(A)** kekal per-sumber + label edisi jujur ·
      **(B)** unifikasi al-Maknaz (mhashim ada semua 9 kitab seragam — perlu
      re-import/padan) · **(C)** unifikasi عبد الباقي untuk Sahihayn.
      Nombor sekarang campuran: Bukhari ab=7,277 vs عبد الباقي=7,563.
- [ ] **E2. Kolum `numbering_edition`** per buku — tertangguh sampai E1 dipilih.
- [ ] **E3. 924 kitab islamdb** guna nombor turutan-BAB, bukan raqm buku — perlu
      sumber/derivasi kalau nak betulkan.
- [ ] **E4. Format papar hukm/takhrij dorar** yang mesra-Malaysia (UI).
- [ ] **E5. Mekanisme fetch dorar skala 85k** — pelayar-sahaja lokal / CF Worker /
      berfasa kitab utama dahulu. ⚠️ Wajib padan **rawi + kitab sumber + matn**
      serentak (lihat amaran keselamatan §8b) — jangan bulk sebelum sahih pada sampel.

## F. Ciri & keselamatan

- [ ] **F0. Carian hadis guna FTS5** — kini `matn_search LIKE '%…%'`
      (`hadis.ts:126`: "D1 belum ada FTS5") = imbasan penuh 85,503 baris setiap
      carian. `hadiths_fts` (85,503, selari) sudah wujud dalam `corpus.db` dan
      akan hidup selepas A1 → tukar carian ke FTS5. Menang besar, kos rendah.
- [ ] **F1. Admin passkey** (fasa 2) — kini kata laluan + GitHub OAuth.
- [ ] **F2. `grade` hanya 3,955 (4.6%)**, `takhrij` 0 → isi dari dorar/Itqan.

---

## ⚠️ Gotcha yang jangan dilupa

- `npm run corpus:build` (build-sqlite dari jsonl) **mungkin PADAM** hasil dedup &
  pemautan dalam `corpus.db`. **`corpus.db` kini sumber kebenaran, bukan jsonl.**
  Semak skrip sebelum guna.
- Turso: `rows written` kira **baris + entri indeks + FTS**. 1 baris ≠ 1 write.
  Sentiasa jalan `node scripts/turso-usage-guard.mjs` sebelum menulis.
- Chrome auto-translate BM AKTIF — jangan scrape HTML dorar via `get_page_text`
  (teks diterjemah!). Guna endpoint JSON.
