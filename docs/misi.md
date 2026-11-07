# Senarai Misi — Dīwān Izhan

> Perkara yang **belum siap**, disusun ikut tema. Tick bila selesai.
> Status siap & sejarah krisis: [`corpus-rescue-status.md`](./corpus-rescue-status.md).
> Senibina: [`hadith-platform.md`](./hadith-platform.md).
> Dibuka: **26 Ogos 2026** (audit selepas repo sunyi sejak 5 Ogos).

---

## A. Infra & data (sedang jalan)

- [x] ✅ **A1. Migrasi D1 → Turso — SELESAI 26 Ogos 2026.** Korpus kini SATU DB
      (**`dewan-izhan-v3`**); lihat A5b — v2 tersangkut, dibina semula sebagai v3.
      **Kos: 0 rows_written** untuk 2.1 juta baris / 888 MB.
      Kaedah: `turso db create --from-file` = UPLOAD fail, bukan INSERT baris.
      Disahkan empirik dahulu (probe 50k baris + indeks → usage kekal 0/10M) —
      inilah yang mengelak ulangan kesalahan lama (DROP+reinsert 1.4M×11 = 15.7M
      writes → akaun diblok). D1 penuh 524/500MB; Turso muat 5GB.
      Audit sebelum seed: `corpus.db` ialah **superset tegas** D1 — `hadiths`,
      `translations`, `books`, `hadith_bab` cap-jari sama tepat; `glossary` lokal
      +12; `hadith_ruling` D1-sahaja **0** (lebihan 992 D1 sebenarnya 1,000 PENDUA
      kerana D1 tiada constraint UNIQUE, tolak 8 baris lokal-sahaja);
      `hadith_sanad_override` lebihan D1 = baris ujian (`edited_by='test'`).
      Pengesahan selepas seed: 15 jadual padan pada kiraan DAN cap-jari nilai.
      Alat: `build-unified-corpus.py` · `verify-unified.mjs`.
- [x] ✅ **A2. Syarah kosong — PULIH 26 Ogos.** `/api/syarah?book=900003&kitab=1`
      dari `{"segs":[]}` (11 bait) → **367 KB**; Nawawi/Muslim 1.63 MB.
      Bukan data hilang: `sharh_segment` (9,277) selamat di Turso. Bugnya
      `src/lib/hadis.ts:277` — `turath_book` dibaca dari **Turso** tetapi
      `sharh_segment` dari **`hadithDb` (D1)**, sedangkan commit `92cb8b0` sudah
      DROP jadual itu dari D1. Query lempar → `catch → return null` → `segs: []`.
      **Sembuh oleh A1** (satu DB, `hadithDb` = `corpus`). Disahkan hidup di v3.
- [x] ✅ **A2b. `turath_page` (30,785) + `turath_heading` (2,532) PULIH** — dahulu
      hilang dari SEMUA DB hidup (di-DROP dari D1, tak pernah masuk Turso), jadi
      pembaca teks-penuh syarah mati senyap. Kini hidup dalam v3.
- [ ] **A3. Rotate kunci Supabase** — separuh selesai oleh A1: kredential **Turso
      lama sudah mati** (DB `dewan-izhan` dipadam → semua tokennya batal), dan v3
      guna token baharu yang tak pernah terdedah. **Yang berbaki: kunci Supabase**
      (`SUPABASE_SECRET_KEY`, `DATABASE_URL`) yang pernah muncul dalam chat.
- [ ] **A4. Buang D1 `dewan-hadis`** — kini TIDAK DIGUNAKAN oleh kod (kekal utuh
      sebagai sandaran kandungan). Tunggu beberapa kitaran deploy, kemudian
      buang binding `[[d1_databases]]` dari `wrangler.toml` + DROP DB.
- [ ] **A5b. ⚠️ INSIDEN TURSO 26 Ogos — `dewan-izhan-v2` tersangkut.** Beberapa
      minit selepas migrasi berjaya & disahkan, SEMUA query ke v2 mula pulangkan
      HTTP 400: `unable to acquire shared lock on node [...01a03d33-5801-7919-bfb2-
      6117819d660c] (deletion must be in progress)`. Node itu = v2 sendiri.
      **Tiada arahan padam pernah dikeluarkan ke atas v2** — hanya ke atas
      `dewan-izhan` (berjaya) dan `probe-fromfile` (gagal 5×, `internal server
      error`). Nampaknya kerja padam tersangkut di sebelah Turso mencemarkan
      kunci node lain dalam kumpulan yang sama.
      Bukti platform sihat: cipta DB baharu + query BERJAYA (`probe2-health`),
      `turso group list` = Healthy. Jadi bukan isu akaun/kuota/token — token
      baharu pun ditolak sama.
      **PULIH ✅** — `dewan-izhan-v3` dibina semula dari fail yang sama (847 MB,
      ~13 min di WiFi, **0 writes**), 15 jadual disahkan padan, laman hidup penuh.
      Data tak pernah hilang — `data/corpus.db` kekal sumber kebenaran.
      Salin sisi-pelayan `--from-db dewan-izhan-v2` DICUBA dahulu untuk elak muat
      naik — ditolak (`internal server error`), v2 tercemar sepenuhnya.
      **Pengajaran:** JANGAN padam DB lama sebaik migrasi; simpan sekurang-kurangnya
      satu kitaran. Kalau `dewan-izhan` masih ada, pemulihan hanya tukar secret.
- [ ] **A5. Bersihkan DB Turso berlebihan** — kini ADA 4: `dewan-izhan-v3` (hidup,
      KEKALKAN) · `dewan-izhan-v2` (tersangkut — biar dahulu, mungkin jadi rollback
      kalau Turso lepaskan kunci) · `probe-fromfile` + `probe2-health` (ujian kosong) — DB ujian kosong; API Turso pulang
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
- [x] ✅ **B8. 12 entri glosari** — selesai oleh A1; laman kini papar 2,181
      (dahulu D1 papar 2,169). `glossary-d1-sync.sh` sudah lapuk.

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
- [x] ✅ **D3. Sync pemautan ke Turso** — selesai oleh A1: v2 diseed dari
      `corpus.db` jadi pemautan terkini (166,923) kini hidup, dahulu 166,901.
      (v3 mewarisi sama — fail seed identik.)
      Untuk sync AKAN DATANG: guna `turso-delta-hn.mjs` (UPDATE baris berubah
      sahaja), BUKAN full-resync (~265k–700k writes).

## E. Keputusan pemilik (blocking — kerja tak boleh sambung tanpa ini)

- [x] ✅ **E1. DIPUTUSKAN 2026-11-08: (A) per-sumber + label edisi jujur.** Import Shamela guna nombor edisi cetakan muhaqqiq; label edisi dipaparkan. Asal soalan:
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

## G. Infra kos percuma (7–8 Nov 2026) — lihat `docs/worker-cpu/README.md`

- [x] ✅ **G1.** Had CPU Worker percuma: kitab + top-10k perawi + muka utama jadi aset statik; perawi lain/carian/404 di `worker.ts` tanpa React.
- [x] ✅ **G2.** Senarai penuh guru/murid (bersiri + tapis nama, tanpa Turso).
- [x] ✅ **G3.** Bacaan Turso semasa deploy: cache ikut cap jari data (`scripts/static-fingerprint.mjs`).

## H. Pelengkapan dari Maktabah Shamela lokal (dibuka 8 Nov 2026)

Pemetaan (read-only): 895 kitab stub; **504 padan tajuk Shamela** (409 tepat, 95 kabur), semua sudah dimuat turun; 391 tiada padanan tajuk.
Prinsip: amanah > laju — teks diambil terus dari Shamela (tiada rekaan), label edisi/muhaqqiq, rintis satu kitab dahulu, sahkan sampel, baru skala. Anggar baris Turso (tulis/baca/storan) SEBELUM setiap import ([`feedback_turso_bacaan_build`]).

- [x] ✅ **H1. SIAP 8 Nov — Sahih Ibn Khuzayma (id 345) diimport ke Turso**: 3,067 hadis dari Shamela #1446 (3,067/3,067 verbatim; 13 raqm tiada dalam sumber; 1068 anomali sumber), 2,140 bab, label edisi `(مستنبط)`. Pengimport `scripts/shamela/`; laluan CI `import-delta.yml` (dry-run/apply/rollback). Asal: **H1. Rintis import satu kitab** (cth Sahih Ibn Khuzayma, id 345): pemisah hadis + raqm edisi + bab; semak sampel vs Shamela.
- [x] ✅ **H2. Muka kitab besar di luar had 19k aset** → belanjawan aset (`scripts/lib/static-budget.mjs`) + penyaji kitab Worker berkongsi templat/SQL dengan penjana (`src/static/kitab-route.ts`); laluan Next kitab dibuang. Lihat `docs/worker-cpu/README.md` §H2.
- [ ] **H3. B4 pengarang** dari `master.db` (author + tahun wafat) untuk 399 padanan unik; edisi kabur → semak manual.
- [ ] **H4. Skala import** kitab stub berperingkat (kitab hadis tulen dahulu; Tarikh Dimashq/Istidhkar bukan himpunan hadis tulen — tangguh).
- [ ] **H5. Profil perawi (D1)** dari kitab rijal tempatan (Taqrib, Tahdhib al-Kamal, al-Kashif…) — padanan entiti wajib disemak.
- [ ] **H6. Darjat (F2) — DORAR DIUTAMAKAN** (arahan pemilik 8 Nov): `hadith_ruling` (source='dorar') sudah meliputi 75,732/85,503 hadis (88.6%), 1.12 juta hukm daripada ramai ulama (al-Arna'ut, al-Albani, al-Bukhari, Muslim, Abu Hatim, Ibn Hibban, al-Daraqutni, Ahmad Shakir, Ibn Hajar, al-Haythami…). Keutamaan: (1) dorar dahulu — lengkapkan 9,771 hadis tanpa hukm + semua hadis import Shamela baharu melalui API JSON dorar (E5); (2) sumber Shamela di bawah HANYA untuk jurang yang dorar tiada, dilabel `source='shamela:<kitab>'`, dipapar selepas dorar. PELBAGAI ulama, bukan al-Albani sahaja. Setiap hukm dinisbah kepada penilainya + kitab + edisi, dipapar bersebelahan tanpa tarjih (neutral). Sumber tempatan sasaran:
      - Mutaqaddimun/pertengahan: al-Hakim & al-Dhahabi (Talkhis al-Mustadrak), al-Mundhiri (al-Targhib), al-Nawawi (al-Khulasa/al-Majmu'), al-Zayla'i (Nasb al-Raya), Ibn al-Mulaqqin (al-Badr al-Munir), al-'Iraqi (al-Mughni 'an Haml al-Asfar), al-Haythami (Majma' al-Zawa'id), Ibn Hajar (Talkhis al-Habir, Fath al-Bari, Mukhtasar Zawa'id), al-Busiri (Misbah al-Zujaja, Ithaf al-Khiyara), al-Suyuti (al-Jami' al-Saghir).
      - Mu'asirin: al-Albani (55 judul), Shu'ayb al-Arna'ut (tahqiq Musnad Ahmad, Sahih Ibn Hibban, Sunan), Ahmad Shakir (Musnad), Husayn Salim Asad (Musnad Abi Ya'la, Sunan al-Darimi), Muqbil al-Wadi'i (al-Sahih al-Musnad).
      - Wajib: padan rawi + kitab sumber + matn serentak (§8b); hukm dari NOTA KAKI muhaqqiq dinisbah kepada muhaqqiq, bukan pengarang; rintis satu sumber + sampel disemak sebelum skala.

## F. Ciri & keselamatan

- [ ] **F0. Carian hadis guna FTS5** — kini `matn_search LIKE '%…%'`
      (`hadis.ts:126`: "D1 belum ada FTS5") = imbasan penuh 85,503 baris setiap
      carian. `hadiths_fts` (85,503, selari) kini **sudah hidup** dalam v2
      selepas A1 → tinggal tukar query ke FTS5. Menang besar, kos rendah.
- [ ] **F1. Admin passkey** (fasa 2) — kini kata laluan + GitHub OAuth.
- [ ] **F2. (lihat H6 — data dorar sudah 88.6% dalam `hadith_ruling`; kolum `hadiths.grade` lama hanya 2,581)** asal: `grade` hanya 3,955 (4.6%), `takhrij` 0 → isi dari dorar/Itqan.

---

## ⚠️ Gotcha yang jangan dilupa

- `npm run corpus:build` (build-sqlite dari jsonl) **mungkin PADAM** hasil dedup &
  pemautan dalam `corpus.db`. **`corpus.db` kini sumber kebenaran, bukan jsonl.**
  Semak skrip sebelum guna.
- Turso: `rows written` kira **baris + entri indeks + FTS**. 1 baris ≠ 1 write.
- Turso: `rows read` kira baris yang **diimbas**, bukan dipulangkan. `LIMIT/OFFSET`,
  `count(*)` dan `GROUP BY` ke atas satu kitab besar = puluhan ribu bacaan SETIAP
  paparan. 22–23 Okt 2026: crawler merayap Musnad Ahmad → ~10 juta bacaan/jam
  (82.8% had dalam 3 hari). Baiki: `hadiths.seq` + `book_chapter` + indeks
  (`db/migrations/2026-10-23-bacaan-murah.sql`). Hadis tanpa seq tak muncul di muka
  kitab — `scripts/segar-seq.mjs` menyegarkannya SECARA AUTOMATIK: dipanggil di hujung
  skrip import/sync, dan `kuota.yml` menyemak + membaiki produksi setiap 3 jam.
  Skrip import BAHARU: tambah cangkuk yang sama di hujungnya.
  Ukur kos query baharu dengan Hrana `/v2/pipeline` (`rows_read`) sebelum deploy.
- Pertahanan kuota berlapis (23 Okt 2026): (1) query murah di atas; (2) `worker.ts`
  cache tepi 6 jam — suntingan admin mungkin lewat ≤6 jam kelihatan; (3) crawler
  alat SEO (punca: **SemrushBot**) disekat 403 + robots.txt — senarai dalam
  `src/app/robots.ts` & `worker.ts` mesti selaras; (4) `kuota.yml` setiap 3 jam,
  MERAH bila kadar 3 jam terakhir akan melepasi had sebelum kitaran tamat.
  Sentiasa jalan `node scripts/turso-usage-guard.mjs` sebelum menulis.
- Chrome auto-translate BM AKTIF — jangan scrape HTML dorar via `get_page_text`
  (teks diterjemah!). Guna endpoint JSON.
