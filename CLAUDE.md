@AGENTS.md

# CLAUDE.md — Dīwān Izhan · syaifulizhan.my

Konteks projek penuh untuk Claude Code. Baca fail ini sebelum menulis kod.
(Nota Next.js 16 ada dalam `AGENTS.md` di atas.)

---

## 0. Status & Setup Sebenar

Setup ini **berbeza sedikit** dari spec lama (chat terdahulu) kerana kita guna
versi terkini dan kaedah deploy paling stabil:

| Perkara | Spec lama | Sebenar (sekarang) |
|---------|-----------|--------------------|
| Lokasi projek | subfolder `diwan-izhan` | **root repo `syaifulizhan`** (Cloudflare dah sambung sini) |
| Next.js | 15 | **16** (terkini) |
| Tailwind | v3 + `tailwind.config.ts` | **v4** (config dalam CSS via `@theme`) |
| Deploy | `@cloudflare/next-on-pages` + edge runtime | **Static export** (`output: 'export'`) → `out/` |
| Nama Arab | (tidak konsisten) | **سَيْف الإِذهَان** · brand **دِيوَان الإِذهَان** (dengan ذ) |

**Kenapa static export:** Fasa 1 ialah laman marketing statik (data hadith
hardcode, tiada Supabase). Static export = build hampir mustahil merah, tiada
adapter yang ketinggalan versi, tiada wrangler/edge runtime. Bila masuk Fasa 2
(SSR/Supabase) baru naik taraf ke `@opennextjs/cloudflare`.

### Tetapan Cloudflare Pages (set di dashboard)
```
Build command      : npm run build
Build output dir    : out
Production branch    : main  (atau branch yang awak nak deploy)
Env var             : NODE_VERSION = 20  (atau ke atas)
```

---

## 1. Identiti Projek

- **Nama:** Dīwān Izhan (`دِيوَان الإِذهَان`)
- **Domain:** syaifulizhan.my
- **Pemilik:** Muhammad Syaiful Izhan bin Shahruddin (`سَيْف الإِذهَان`)
- **Tujuan:** Laman peribadi ilmu riwayah/hadith + perkhidmatan bina web/app
- **Dua zon:** Zon Ilmu (percuma, bersih) · Zon Khidmat (komersial, dipisahkan jelas)

---

## 2. Stack Teknikal

```
Framework : Next.js 16 (App Router) + Turbopack
Bahasa    : TypeScript (strict)
CSS       : Tailwind CSS v4 (@theme dalam globals.css)
Hosting   : Cloudflare Pages (static export → out/)
Database  : Supabase (Fasa 2+)
Auth      : Clerk (Fasa 4)
Git       : GitHub repo `syaifulizhan/syaifulizhan`
```

Scripts: `dev`, `build` (jana `out/`), `start`, `lint`.

---

## 3. Design System

Token warna & font **sudah hidup dalam `src/app/globals.css`** (`@theme`).
Pakai sebagai utility Tailwind (`bg-midnight`, `text-gold`, `font-arabic`) atau
CSS var (`var(--color-gold)`, `var(--line-dark)`).

```
midnight  #16131F   midnight2 #1E1A2A   midnight3 #272237
gold      #C7A338   gold-soft #D9BF6C
lapis     #3A5894   rubric    #9E3B2E
vellum    #F4ECDC   vellum2   #EDE3CF
ink       #211D15   ink-soft  #5B5347
paper     #E9E0CF   muted     #A89E8B
line-dark  rgba(199,163,56,0.22)   line-light rgba(33,29,21,0.13)
```

Font: Cormorant Garamond (display) · IBM Plex Sans (body) · Amiri (Arab) —
dimuat via `<link>` Google Fonts dalam `layout.tsx`.
Reka bentuk: `۞` hiasan, sempadan 1px, **tiada border-radius** pada elemen utama.

---

## 4. Susunan Bina

```
✅ Langkah 1  Init + static export + globals.css + tokens + build hijau
   Langkah 2  src/lib/types.ts + src/lib/hadith.ts (data hardcode)
   Langkah 3  Komponen UI: StarPattern, Button, Eyebrow, FadeIn
   Langkah 4  Nav, Hero, SanadExplorer (klien), Ilmu, Tentang, Khidmat, Footer
   Langkah 5  Pasang dalam page.tsx + uji build + deploy
```

Ringkasan seksyen:
- **Hero:** unwan box, basmala, nama Arab, H1 "Ilmu yang boleh disemak", CTA.
- **Sanad Explorer (elemen tanda):** chip pilih hadith → matn Arab + terjemahan
  + badge darjat/takhrij; panel kanan "Silsilat al-Isnād" node Nabi→Mukharrij,
  animasi stagger 65ms.
- **Ilmu (latar vellum):** 3 kad — ʿIlm al-Ḥadīth, ʿIlm al-Riwāyah, Maqālāt.
- **Tentang:** biografi + trinity pillars (Ilmu/Alat/Bahasa).
- **Khidmat (zon komersial):** solusi digital untuk masjid, sekolah/pondok,
  duʿat, pertubuhan Islam. CTA "Bincang projek anda".
- **Footer:** brand + handle sosial + copyright.

---

## 5. Peraturan Kod

- `'use client'` hanya untuk komponen ada state/interaksi (SanadExplorer, FadeIn).
- TypeScript strict — tiada `any`.
- Warna guna token (`bg-...` / `var(--color-...)`), bukan hex bertaburan.
- Tiada border-radius pada elemen utama.
- PascalCase komponen, camelCase fungsi.
