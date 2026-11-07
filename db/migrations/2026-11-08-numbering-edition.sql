-- E2 (unblocked by E1, 8 Nov 2026): honest edition label per book for imported hadith numbers.
-- `hadiths.number` = printed raqm of THIS edition (per-source numbering). NULL = legacy/unlabelled.
-- Set by scripts/shamela/import-book.mjs (UPDATE books SET numbering_edition = ...).
-- Turso cost: one ALTER (schema change, no row rewrite) + 1 row write per labelled book.
ALTER TABLE books ADD COLUMN numbering_edition TEXT;
