-- Korpus Dewan Izhan — SQLite/libSQL (Turso)
-- Diport dari islam-db.com (753k hadis, 42k perawi, 1400 kitab).
-- Catatan: jadual FTS5 dicipta & diisi dalam langkah build (scripts/build-sqlite.mjs),
-- bukan di sini, supaya import pukal laju dan boleh rebuild.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Taksonomi ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id        INTEGER PRIMARY KEY,        -- id islam-db
  name_ar   TEXT NOT NULL,
  slug      TEXT,
  parent_id INTEGER
);

CREATE TABLE IF NOT EXISTS authors (
  id         INTEGER PRIMARY KEY,       -- id islam-db
  name_ar    TEXT NOT NULL,
  slug       TEXT,
  death_year INTEGER
);

CREATE TABLE IF NOT EXISTS books (
  id            INTEGER PRIMARY KEY,    -- id islam-db
  title_ar      TEXT NOT NULL,
  slug          TEXT,
  author_id     INTEGER REFERENCES authors(id),
  topic_id      INTEGER REFERENCES topics(id),
  total_hadith  INTEGER,
  chapter_count INTEGER
);

-- ── Perawi & graf sanad ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS narrators (
  id          INTEGER PRIMARY KEY,      -- id islam-db (/narrators/{id})
  name_ar     TEXT NOT NULL,            -- الأسم
  name_search TEXT,                     -- normalizeArabic(name_ar) utk FTS
  shuhra      TEXT,                     -- الشهرة
  kunya       TEXT,                     -- الكنية
  nisba       TEXT,                     -- النسب
  rutbah      TEXT,                     -- الرتبة (صحابي/ثقة/مجهول/...)
  profession  TEXT,                     -- الوظيفة
  regions     TEXT,                     -- عاش في (tempat tinggal)
  mawla       TEXT,                     -- مولي / مولى (naungan)
  birth_year  INTEGER,
  death_year  INTEGER,                  -- توفي عام
  death_place TEXT,                     -- مات في
  bio_ar      TEXT,                     -- عن حياة الراوي
  scraped_at  TEXT
);

CREATE TABLE IF NOT EXISTS narrator_grades (   -- الجرح والتعديل
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  narrator_id INTEGER NOT NULL REFERENCES narrators(id),
  scholar     TEXT,                     -- nama pengkritik
  verdict     TEXT                      -- teks penilaian
);
CREATE INDEX IF NOT EXISTS idx_ngrades_narrator ON narrator_grades(narrator_id);

CREATE TABLE IF NOT EXISTS narrator_relations (  -- tepi graf guru→murid
  teacher_id INTEGER NOT NULL REFERENCES narrators(id),
  student_id INTEGER NOT NULL REFERENCES narrators(id),
  PRIMARY KEY (teacher_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_nrel_student ON narrator_relations(student_id);

-- ── Hadis & isnad ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hadiths (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- surrogate (islam-db tiada id global terdedah)
  src_ref     TEXT UNIQUE,              -- "book:chapter:seq" — kunci asli utk re-scrape selamat
  book_id     INTEGER REFERENCES books(id),
  chapter_ref INTEGER,                  -- nombor bab islam-db (/single-book/.../{bab})
  chapter_ar  TEXT,                     -- tajuk باب
  number      INTEGER,                  -- turutan hadis dalam bab
  matn_ar     TEXT NOT NULL,            -- teks penuh (isnad + matn) spt dipapar
  matn_search TEXT,                     -- normalizeArabic(matn_ar) utk FTS
  grade       TEXT,                     -- darjat (jika ada)
  grader      TEXT,                     -- al-muhaddith (jika ada)
  takhrij     TEXT,
  scraped_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_hadiths_book ON hadiths(book_id);

CREATE TABLE IF NOT EXISTS hadith_narrators (  -- rantai isnad bertertib
  hadith_id   INTEGER NOT NULL REFERENCES hadiths(id),
  narrator_id INTEGER REFERENCES narrators(id),  -- nullable: kadang tak terpadan
  position    INTEGER NOT NULL,         -- 0 = perawi terdekat mukharrij
  raw_name    TEXT,
  PRIMARY KEY (hadith_id, position)
);
CREATE INDEX IF NOT EXISTS idx_hnar_narrator ON hadith_narrators(narrator_id);

-- ── Terjemahan (AI + manual) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,            -- 'hadith' | 'narrator'
  entity_id   INTEGER NOT NULL,
  lang        TEXT NOT NULL,            -- 'ms' | 'en'
  text        TEXT NOT NULL,
  source      TEXT,                     -- 'ai' | 'manual' | 'AhmedBaset'
  model       TEXT,                     -- cth 'claude-haiku-4-5'
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT,
  UNIQUE(entity_type, entity_id, lang, source)
);
CREATE INDEX IF NOT EXISTS idx_tr_entity ON translations(entity_type, entity_id, lang);

-- Meta: jejak kemajuan scrape/import
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
