# Misi Selamatkan Korpus — Status Hidup (Mission Control)

> Keadaan SEMASA misi selamatkan موسوعة الحديث (islam-db.com) — scrape & pulih perawi,
> matan hadis, sanad. Kekal merentas sesi. Senibina: [`hadith-platform.md`](./hadith-platform.md).
> Kemas kini: **1 Julai 2026**.

## 0. MATLAMAT BESAR (jangan lupa lagi)
Selamatkan korpus mausu'ah hadithiyyah yang **rosak/hilang** dari islam-db.com:
1. **100k+ PERAWI** — kini baru 25k dari islam-db (scrape belum habis) + 102k Itqan.
2. **100k+ MATAN HADIS** — kini 60k (50.9k AhmedBaset + 9.6k islam-db); islam-db belum habis.
3. Sanad/isnad + gred rijal, padan identiti perawi (entity resolution).

## 1. Seni bina data — 3 BAHAGIAN (jangan campur!)
- **Supabase** — auth + moderasi cadangan.
- **Cloudflare D1** (`dewan-hadis` D1) — BACAAN: books 942, hadiths 60,514, translations 48,337, glossary. ✅ lengkap.
- **Turso** (`dewan-hadis` libsql) — PERAWI/ISNAD: narrators, narrator_grades, narrator_relations, hadith_narrators, narrators_fts.
Bukti kod: `hadis.ts`→D1; `narrators.ts`+`getIsnadFor`→Turso. Lokal `data/corpus.db` = superset.

## 2. Inventori data mentah (data/) — apa yang DAH ADA
| Fail | Baris | Makna |
|---|---|---|
| islamdb/narrators.jsonl | **25,072** | perawi islam-db (scrape) |
| islamdb/hadith.jsonl | 10,528 | matan islam-db (scrape) |
| islamdb/ahmedbaset.jsonl | 50,901 | matan AhmedBaset (17 kitab) |
| itqan/narrators.itqan.jsonl | **102,783** | perawi Itqan (id≥2,000,000) |
| itqan/relations.itqan.jsonl | 332,340 | tepi sanad Itqan |
| itqan/grades.itqan.jsonl | 28,801 | gred rijal Itqan |
**corpus.db** (dibina): narrators 127,869 (islamdb 25,086 + itqan 102,783) · hadiths 60,514 · relations 509,367 · hadith_narrators 339,315 · grades 246,050 · translations 48,337 · books 942.

## 3. STATUS SCRAPE — BELUM HABIS (kerja utama)
**Perawi (`scrape-narrators.mjs`):** checkpoint `lastId=42517, ok=25072, missing=17445`; gagal 94.
- ⚠️ Berhenti sebab **had lalai `--to=42517`**, BUKAN habis. islam-db ada perawi ID > 42517.
- Sambung: `node scripts/scrape-narrators.mjs --to=<lebih tinggi>` (kena tentukan max ID sebenar dulu — probe islam-db).

**Hadis (`scrape-hadith.mjs`):** checkpoint `book=1422, books=925, hadiths=9603, missing=33`; gagal 824.
- ⚠️ Hampir had lalai **`--maxBook=1500`**; hasil per-kitab rendah (~10/kitab) — perlu siasat sama ada parser tercicir bab/hadis.
- Sambung: `node scripts/scrape-hadith.mjs --maxBook=<lebih tinggi>`; `node scripts/retry-failed.mjs` (824+94 gagal).

**Sumber:** `https://hadith.islam-db.com` — laman yang kita SELAMATKAN (mungkin tak stabil). Scraper beradab (delay), resumable checkpoint.

## 4b. TOK SYEIKH — sumber otoritatif (arahan pemilik: ikut sepenuhnya, jangan memandai)
Untuk ketepatan 100% & pengesahan identiti perawi (jangan tertukar orang):
1. **sunna.alifta.gov.sa** (utama) — Angular SPA (data via API). `find`/`get_page_text` boleh baca; `computer`/JS **tak boleh attach** (CDP disekat browser ini). Automasi UI terhad → guna get_page_text/navigate atau cari API.
2. **hadithtransmitters.hawramani.com** (kedua) — ⭐ AKSES TERUS DB via **WordPress REST API**! `GET /wp-json/wp/v2/posts?per_page=100&page=N&_fields=id,title,slug,link` → JSON, **X-WP-Total = 100,915 perawi**. Fasa A (`scripts/fetch-hawramani.mjs`): tarik indeks nama+slug+id → `data/hawramani/narrators.hawramani.jsonl`. ⚠️ `content` REST KOSONG → biografi penuh (jarh-ta'dil dari 62 kitab: Ibn Sa'd, Bukhari Tarikh Kabir, Ibn Abi Hatim, Ibn Hibban, Dhahabi Siyar/Mizan, Ibn Hajar...) ada dalam **HTML halaman** (`/<slug>/`, ~38KB) → fasa B parse. Sumber Shamela (domain awam).
3. **ihsanetwork.org** (ketiga) — "شبكة إحسان" portal kajian, BUKAN WP/DB perawi boleh-query (14KB shell). Rujukan manual sahaja.
- Disahkan: bio hawramani ada **روى عن/روى عنه** (guru/murid) + jarh-ta'dil (cth "قال يحيى بن معين: كذاب") → boleh disambiguate + enrich. alifta API tersembunyi dlm Angular (CDP disekat). **hawramani = satu-satunya sumber pukal boleh-automasi.**
Guna: (a) enrich/tambah profil perawi baki, (b) sahkan identiti nama isnad tak pasti sebelum paut.

## 4. Itqan — DISAHKAN ADA ✅
R3GENESI5/Itqan (GitHub, 114k profil, 22 kitab rijal). Import → 102,783 perawi (id 2,000,000+). 
Ada di: `data/itqan/*.jsonl`, clone `data/Itqan/`, DAN **Google Drive** (folder `itqan`+`rijal`, fail jsonl + repo). Jurang 114k→102,783 (~11k) belum disiasat.

## 5. Turso — ✅ DIPINDAH KE AKAUN BAHARU, PERAWI LIVE (1 Jul)
**SELESAI.** Akaun lama diblok (15.7M>10M) → pindah ke akaun baharu **org `syaifulizhan-thgzut`, DB `dewan-izhan`** (host `dewan-izhan-syaifulizhan-thgzut.aws-ap-south-1.turso.io`). Seed sekali dari corpus.db: narrators 127,869 · grades 246,050 · relations 509,367 · hadith_narrators 339,315. Usage ~2.4M/10M (24%). Secret Cloudflare `TURSO_DATABASE_URL`+`TURSO_AUTH_TOKEN` dikemas → **perawi live disahkan** (60 pautan /perawi, profil HTTP 200). Token dalam `.env.local` (TURSO_API_TOKEN, TURSO_AUTH_TOKEN_NEW) — gitignored. Backup akaun lama: `data/turso-remote-backup/`.

### (arkib) Turso lama — akaun diblok
- ⛔ Walau `rows written` reset ke 0/10M, **akaun kekal BLOCKED** ("SQL write operations are forbidden"). Reads OK, writes tidak. Blok tak clear automatik.
- ✅ **Backup remote SIAP**: `data/turso-remote-backup/turso-remote-2026-07-01.sql` (207M, 783,458 baris, disahkan boleh muat semula). Snapshot keadaan remote (rosak separa).
- **RANCANGAN: tukar akaun Turso baharu** (kuota segar). Seed dari **corpus.db** (PENUH, lebih baik dari backup rosak), bukan dari backup:
  1. Akaun baru: `turso auth login` + `turso db create <nama>`.
  2. `bash scripts/turso-sync.sh <nama-baru> --force` → seed penuh perawi/isnad dari corpus.db.
  3. Kemas `TURSO_DATABASE_URL`+`TURSO_AUTH_TOKEN` di `.env.local` + secret Cloudflare → perawi live pulih.
- Poller `my.dewan.turso-rescue` (30 min) masih probe DB LAMA — buang bila dah tukar akaun.
- Backup: `scripts/turso-backup.mjs` · Seed: `scripts/turso-sync.sh`.

### (arkib) Turso lama — krisis
- rows written **reset ke 0/10M** (1 Jul; reset seterusnya 1 Ogos). Kuota tersedia semula.
- Turso live: `narrators` HILANG, `narrator_relations` 136,500/509,367 (27%), grades+hadith_narrators OK.
- Krisis dulu: `turso-sync.sh` full DROP+reinsert 1.4M ×~11 → 15.7M writes. FIX: preflight + `--force` + skop perawi + buang legasi (siap).
- ⚠️ launchd `my.dewan.turso-rescue` (8:10 pagi) **belum tembak** (log kosong) — boleh jalan manual.
- Pulih: `bash scripts/turso-sync.sh dewan-hadis --force` (~765k writes). NOTA: kalau nak elak sync perawi berulang, lebih baik SIAPKAN scrape dulu, baru sync sekali.

## 6. Glosari (misi sampingan) — 298/543 halaman, ETA ~2 hari
`npm run glossary:resume` (OCR→D1). Gemini cap ~140/hari, reset ~3 ptg MYT. Fix susunan `ال` sudah live.

## 6b. Pemautan nama perawi → isnad (silsilat al-isnad) — SEDANG JALAN
Matlamat: setiap nama dlm isnad boleh-klik ke profil perawi, macam mausu'ah.
- Parser `lib/parse-isnad.mjs` sudah kendali **ح tahwil** (cabang chain_no) + **و 'atf** (2-3 guru selari). Bagus.
- `scripts/link-isnad.mjs` — resolver KETEPATAN-DAHULU (arahan pemilik: "jangan tertukar orang"):
  **Tier 1** nama penuh unik · **Tier 2** shuhra/kunya HANYA bila disokong graf guru-murid jiran. Ragu = TAK dipaut (papar teks biasa). Tulis corpus.db LOKAL.
- Keadaan: **124,114/339,315 (37%)** pautan yakin-tinggi.
- `masyhur_blind` dipin (laqab UNIK-dalam-isnad, entri KAYA ber-relations, disahkan): الزهري#2000569، الأعمش#2000467، الشعبي#2001074، ابن جريج#5223، عبد الرزاق#4533.
- ✅ DEDUP SELESAI (LIVE): `relink-canonical.mjs` (+8,030 nama masyhur/sahabat → entri KAYA penuh, cth الزهري→#2000569) + `dedup-narrators.mjs` (+378 pendua distinktif ≥4 token). Bug "klik→stub" dibetulkan. Konservatif (nama pendek tak digabung, elak namesake).
- RELATIONAL (`scripts/link-relational.mjs`): ابيه/ابي/جده DETERMINISTIK ikut nasab jiran (bapa = nama anak buang ism pertama), konservatif (≥2 token, unik, skip entri berselerak وقيل/تقدم). +227 setakat ni; ITERATIF — jalankan semula selepas setiap fasa (lebih anak dipaut → lebih bapa).
- ID sahabat teratas DIPIN manual (`data/isnad-pinned.json`, disahkan amanah): أبو هريرة#4396، ابن عمر#40553، أنس#2000008، ابن عباس#2000048. Paut ikut IDENTITI NAMA bukan posisi (hormati **mursal/munqati'** — tabi'i boleh riwayat marfu' terus dari Nabi tanpa sahabat; JANGAN reka sahabat).
- **Peta kanonik berkurasi** (`data/isnad-canonical.json` + `scripts/verify-canonical.mjs` + `apply-canonical.mjs`): nama masyhur→perawi kanonik, disahkan DUA-DUA (korpus ikat ism-guard + hawramani), diterap dgn PENGADANG: sahabat=terus (hujung isnad), masyhur=hanya bila graf guru-murid sokong. +4,920 diterap (عائشة#2000342, جابر#36738 disahkan BETUL). AMBIGU (سفيان/حماد/يحيى) & relational (ابيه) TAK disentuh.
- Gain perlahan (amanah > laju): top sahabat أبو هريرة/ابن عمر/أنس GAGAL ikat (ties korpus); masyhur مالك/الأعمش/معمر tiada entri bersih → perlu enrich dari hawramani.
- Naik liputan SECARA TEPAT perlu: (a) lebih profil perawi (scrape islam-db 42k→~60k, + Hawramani/islamweb), (b) nama relational (ابيه/ابي via nasab), (c) **pengesah sunna.alifta.gov.sa** (Angular SPA — perlu jumpa API via pelayar; pemilik beri sbg rujukan otoritatif).
- BELUM sync ke Turso (live masih data lama) — sync SATU kali via turso-sync.sh berpengawal bila liputan tepat dah tinggi (hadith_narrators count sama → perlu paksa sync jadual itu).

## 6c. Nod "ثقتان" (anak murid KEDUA-DUA thiqah) — disiplin hadis
Bila rawi ambil dari KEDUA-DUA (cth سفيان الثوري & ابن عيينة, dua-dua ثقة) & tak beza →
ambiguiti **لا يضر** (sanad tetap sahih). Bukan kecacatan, bukan "gagal kenal".
- `disambiguate-context.mjs`: hit==1→tentu; hit==2 & dua-dua thiqah→**nod ثقتان** (#9000001 "سفيان (الثوري أو ابن عيينة، كلاهما ثقة)"). حماد TIDAK (Ibn Salama ada kalam → mesti tentukan bila boleh).
- 219 kejadian سفيان-ثقتان dipaut. Nod #9000001. Profil nod (perawi/[id]) papar seksyen "كلاهما ثقة" dgn DUA calon BOLEH KLIK (al-Thawrī#2000434 & Ibn ʿUyaynah#3443) via peta `THIQATAN_ALTS` — LIVE. Orang manfaat biodata kedua-dua.

**⚠️ KOS SYNC & DELTA:** full-resync `hadith_narrators` = ~265k-700k writes (rebuild indeks). GUNA **`scripts/turso-delta-hn.mjs`** (baru) — UPDATE hanya baris `narrator_id` BERUBAH (lokal vs live) = ~ribu writes sahaja, melalui guard. Jauh lebih jimat. Full-sync (FORCE_TABLES) hanya utk perubahan besar/skema. Usage 63.6% (1 Jul).

**PAPARAN ISNAD (LIVE):** `src/components/Isnad.tsx` papar **raw_name** (nama sanad asal, cth الزهري); hover=nama penuh (title); klik=`/perawi/<id>` biodata penuh. Bukan papar nama penuh terus.

## 7. LANGKAH SETERUSNYA (checklist)
- [ ] Probe max narrator ID islam-db → sambung `scrape-narrators.mjs --to=N` sampai 100k+.
- [ ] Naikkan `scrape-hadith.mjs --maxBook` + siasat hasil rendah → 100k+ matan.
- [ ] `retry-failed.mjs` (824 hadis + 94 perawi gagal).
- [ ] Siasat jurang Itqan 114k→102,783.
- [ ] `npm run corpus:build` → bina semula corpus.db.
- [ ] Pulih Turso perawi (`turso-sync.sh --force`) + sahkan perawi live hidup.
- [ ] Sambung OCR glosari sampai 543/543.
