#!/usr/bin/env bash
# Sync hadith_bab (hadis→باب, padanan matan) → D1. Data-JANA (bukan pemilik-edit) →
# DELETE+INSERT selamat. Utk syarah per-hadis + navigasi ToC باب.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL hadith_bab …"
python3 - "$OUTDIR" <<'PY'
import sqlite3, sys
outdir = sys.argv[1]
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
rows = con.execute("SELECT hadith_id, kitab_title, bab_no, bab_title FROM hadith_bab").fetchall()
con.close()
with open(f"{outdir}/000.sql", "w") as f:
    f.write("CREATE TABLE IF NOT EXISTS hadith_bab (hadith_id INTEGER PRIMARY KEY, kitab_title TEXT, bab_no INTEGER, bab_title TEXT);\n")
    f.write("DELETE FROM hadith_bab;\n")
B = 400; fi = 1
for bi in range(0, len(rows), B):
    with open(f"{outdir}/{fi:04d}.sql", "w") as f:
        for hid, kt, bn, bt in rows[bi:bi+B]:
            f.write(f"INSERT INTO hadith_bab (hadith_id,kitab_title,bab_no,bab_title) VALUES ({hid},{esc(kt)},{bn},{esc(bt)});\n")
    fi += 1
print(f"  {len(rows)} baris → {fi} fail")
PY

echo "→ Muat ke D1 ($DB) …"
for f in "$OUTDIR"/000.sql "$OUTDIR"/[0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
done
echo "✓ hadith_bab di D1."
