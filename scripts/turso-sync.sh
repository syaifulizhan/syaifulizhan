#!/usr/bin/env bash
# Re-sync korpus tempatan (data/corpus.db) → Turso cloud (dewan-hadis).
# Jana dump bersih (buang FTS shadow + writable_schema, DROP dahulu, cipta semula FTS),
# kemudian muat ke Turso. Jalankan selepas corpus:build bila nak segarkan tapak live.
#   bash scripts/turso-sync.sh [nama-db]
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
OUT=/tmp/turso_sync.sql

echo "→ Jana dump bersih dari data/corpus.db ..."
python3 - "$OUT" <<'PY'
import sqlite3, re, sys
out = sys.argv[1]
con = sqlite3.connect("data/corpus.db")
tables = ["topics","authors","books","narrators","narrator_grades","narrator_relations",
          "hadiths","hadith_narrators","translations","meta","glossary"]
fts = re.compile(r'''(CREATE (VIRTUAL )?TABLE|INSERT INTO|CREATE TRIGGER)\s+['"]?\w*_fts''')
with open(out, "w") as f:
    f.write("PRAGMA foreign_keys=OFF;\n")
    # DROP ikut susunan ANAK-DULU (jadual lama di Turso ada FK; libsql enforce FK masa DROP)
    drop_order = ["narrators_fts", "hadiths_fts", "narrator_relations", "hadith_narrators",
                  "narrator_grades", "translations", "hadiths", "glossary", "meta",
                  "books", "narrators", "authors", "topics"]
    for t in drop_order:
        f.write(f"DROP TABLE IF EXISTS {t};\n")
    for line in con.iterdump():
        if fts.search(line) or "writable_schema" in line:
            continue
        # Buang klausa FK (libsql tak hormat PRAGMA foreign_keys=OFF; tepi tergantung sah)
        line = re.sub(r"REFERENCES\s+\w+\s*\([^)]*\)", "", line)
        f.write(line + "\n")
    f.write("CREATE VIRTUAL TABLE IF NOT EXISTS narrators_fts USING fts5(name_search, content='narrators', content_rowid='id');\n")
    f.write("INSERT INTO narrators_fts(narrators_fts) VALUES('rebuild');\n")
    f.write("CREATE VIRTUAL TABLE IF NOT EXISTS hadiths_fts USING fts5(matn_search, content='hadiths', content_rowid='id');\n")
    f.write("INSERT INTO hadiths_fts(hadiths_fts) VALUES('rebuild');\n")
con.close()
print(f"  dump: {out}")
PY

echo "→ Muat ke Turso ($DB) ..."
turso db shell "$DB" < "$OUT"
echo "→ Kiraan di Turso:"
turso db shell "$DB" "SELECT 'narrators' t,count(*) n FROM narrators UNION ALL SELECT 'hadiths',count(*) FROM hadiths UNION ALL SELECT 'relations',count(*) FROM narrator_relations"
rm -f "$OUT"
echo "✓ Re-sync selesai."
