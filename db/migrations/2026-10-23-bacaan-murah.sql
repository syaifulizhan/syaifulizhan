-- Bacaan murah — 23 Okt 2026.
--
-- KENAPA: bacaan Turso melonjak ~10 juta baris SEJAM (22–23 Okt), 82.8% had
-- bulanan dalam 3 hari. Diukur terus dari Turso (rows_read setiap query):
-- satu paparan /kitab/900002 (Musnad Ahmad, 26,363 hadis) membaca ~105,000 baris
--   count(*) kitab        26,364   (imbas indeks book_id)
--   senarai bab GROUP BY  26,366
--   muka hadis ORDER BY   52,727   (isih seluruh kitab untuk pulangkan 20)
-- dan /hadis membaca 88,327 (JOIN semua hadis untuk kira setiap kitab).
-- Crawler yang merayap ~1,300 muka Musnad Ahmad = tepat kadar yang dilihat.
--
-- Selepas migrasi ini setiap query di atas membaca puluhan baris sahaja:
--   hadiths.seq        turutan dalam kitab (ORDER BY chapter_ref, number, id)
--                      → muka N = julat seq, lompat ke hadis = baca seq-nya
--   books.total_hadith → kiraan tanpa imbasan (lajur sedia ada, dahulu NULL)
--   book_chapter       → senarai bab prakira
--   idx sharh_segment  → syarah tidak lagi imbas 9,277 baris setiap panggilan
--
-- Kos tulisan ≈ 277k (85.5k UPDATE + 2×85.5k indeks + 10.2k bab + 9.3k indeks
-- syarah + 942 kitab) daripada had 10 juta. Tiada trigger pada `hadiths`, jadi
-- UPDATE tidak menyentuh hadiths_fts.
--
-- WAJIB jalan semula bahagian "SEGAR SEMULA" selepas sebarang import hadis baharu
-- (skrip: node scripts/segar-seq.mjs). Baris tanpa seq tidak akan muncul di
-- muka kitab.

ALTER TABLE hadiths ADD COLUMN seq INTEGER;

-- ── SEGAR SEMULA (idempoten) ────────────────────────────────────────────────
UPDATE hadiths SET seq = t.rn
  FROM (SELECT id, row_number() OVER (PARTITION BY book_id ORDER BY chapter_ref, number, id) rn
          FROM hadiths) t
 WHERE t.id = hadiths.id AND hadiths.seq IS NOT t.rn;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hadiths_book_seq ON hadiths(book_id, seq);

UPDATE books SET total_hadith = (SELECT count(*) FROM hadiths h WHERE h.book_id = books.id)
 WHERE total_hadith IS NOT (SELECT count(*) FROM hadiths h WHERE h.book_id = books.id);

CREATE TABLE IF NOT EXISTS book_chapter (
  book_id     INTEGER NOT NULL,
  first_seq   INTEGER NOT NULL,   -- seq hadis pertama bab ini → muka = (first_seq-1)/20+1
  chapter_ref INTEGER,
  chapter_ar  TEXT NOT NULL,
  n           INTEGER NOT NULL,
  PRIMARY KEY (book_id, first_seq)
) WITHOUT ROWID;
DELETE FROM book_chapter;
INSERT INTO book_chapter (book_id, first_seq, chapter_ref, chapter_ar, n)
SELECT book_id, min(seq), chapter_ref, chapter_ar, count(*)
  FROM hadiths
 WHERE chapter_ar IS NOT NULL AND length(chapter_ar) > 0
 GROUP BY book_id, chapter_ref, chapter_ar;

-- getRulingsFor: (book_id, number) IN (VALUES …) — tanpa ini setiap pasangan
-- mengimbas seluruh kitab (26k baris untuk Musnad Ahmad).
CREATE INDEX IF NOT EXISTS idx_hadiths_book_number ON hadiths(book_id, number);

CREATE INDEX IF NOT EXISTS idx_sharh_book_kitab ON sharh_segment(sharh_book_id, kitab_no, bab_no);
CREATE INDEX IF NOT EXISTS idx_turath_book_ref ON turath_book(book_ref);
