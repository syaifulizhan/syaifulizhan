-- ============================================================
-- Platform Hadis & Sanad — Skema Fasa A (Neon / PostgreSQL)
-- Lihat docs/hadith-platform.md untuk konteks & keputusan.
-- Jalankan: psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

create schema if not exists hadith;
set search_path to hadith, public;

create extension if not exists pg_trgm;      -- carian kabur (Arab/BM/EN)
create extension if not exists "uuid-ossp";

-- ── KOLEKSI (kitab) ──────────────────────────────────────────
create table if not exists collections (
  id            text primary key,            -- cth: 'sahih_al_bukhari'
  slug          text unique not null,        -- cth: 'sahih-al-bukhari'
  name_ar       text not null,
  name_en       text,
  name_ms       text,
  author_ar     text,
  author_en     text,
  book_order     int,
  total_hadith   int default 0
);

-- ── HADIS ────────────────────────────────────────────────────
create table if not exists hadiths (
  id                bigint generated always as identity primary key,
  collection_id     text not null references collections(id) on delete cascade,
  number_in_collection int not null,         -- nombor hadis dalam kitab
  arabic_text       text not null,           -- matn + isnad (sumber)
  arabic_search     text,                    -- ternormal (tanpa tashkeel) utk carian
  chapter_ar        text,
  -- jejak sumber untuk padanan & audit
  src_ahmedbaset_id text,
  src_islamware_id  text,
  created_at        timestamptz default now(),
  unique (collection_id, number_in_collection)
);
create index if not exists idx_hadiths_collection on hadiths(collection_id);
create index if not exists idx_hadiths_search_trgm on hadiths using gin (arabic_search gin_trgm_ops);

-- ── DARJAT (grading) ─ boleh banyak per hadis (pengkritik berbeza) ──
create table if not exists gradings (
  id          bigint generated always as identity primary key,
  hadith_id   bigint not null references hadiths(id) on delete cascade,
  grade       text not null,                 -- cth: 'sahih', 'authentic', 'hasan'
  grader      text,                          -- cth: 'al-Bukhari', 'collection-level'
  source      text,                          -- cth: 'ceefour/sanad-hadith'
  created_at  timestamptz default now()
);
create index if not exists idx_gradings_hadith on gradings(hadith_id);

-- ── TERJEMAHAN ─ generik (hadith sekarang, perawi kemudian) ──
-- Arab TIDAK disimpan di sini — ia teks teras dalam entiti masing-masing.
create table if not exists translations (
  id           bigint generated always as identity primary key,
  entity_type  text not null,                -- 'hadith' | (kelak) 'narrator'
  entity_id    bigint not null,
  lang         text not null check (lang in ('ms','en')),
  text         text not null,
  source       text,                         -- cth: 'AhmedBaset', 'AI-draft-v1'
  translator   text,
  is_verified  boolean not null default false,
  verified_by  text,
  verified_at  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (entity_type, entity_id, lang, source)
);
create index if not exists idx_translations_entity on translations(entity_type, entity_id, lang);
create index if not exists idx_translations_search_trgm on translations using gin (text gin_trgm_ops);

-- ============================================================
-- FASA B (perawi & graf sanad) — didokumen, belum dibina:
--
--   narrators (
--     id, name_ar, kunyah, laqab, grade, tabaqah,
--     birth_year, death_year, bio_ar, src_id ...
--   )
--   narration_links (            -- graf sanad: hadis -> rantaian perawi
--     id, hadith_id, position int, narrator_id, raw_segment text
--   )
--
-- Terjemahan bio perawi guna jadual `translations` yang sama
-- (entity_type='narrator').
-- ============================================================
