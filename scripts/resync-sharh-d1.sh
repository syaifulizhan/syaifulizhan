#!/usr/bin/env bash
# Re-sync sharh_segment (semua buku) + turath_book → D1 (selepas DROP). Retry.
set -uo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"; OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
python3 - "$OUT" <<'PY'
import sqlite3, sys
out=sys.argv[1]; con=sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'"+str(v).replace("'","''")+"'"
with open(f"{out}/000.sql","w") as f:
    f.write("CREATE TABLE IF NOT EXISTS turath_book (id INTEGER PRIMARY KEY, name TEXT, author TEXT, info TEXT, npages INTEGER, fetched_at TEXT, book_ref INTEGER);\n")
    f.write("CREATE TABLE IF NOT EXISTS sharh_segment (sharh_book_id INTEGER, kitab_no INTEGER, kitab_title TEXT, bab_no INTEGER, bab_title TEXT, seq INTEGER, para INTEGER, text TEXT);\n")
    f.write("CREATE INDEX IF NOT EXISTS idx_sseg ON sharh_segment(sharh_book_id, kitab_no);\n")
    f.write("DELETE FROM sharh_segment; DELETE FROM turath_book;\n")
    for r in con.execute("SELECT id,name,author,npages,book_ref FROM turath_book"):
        f.write(f"INSERT INTO turath_book (id,name,author,npages,book_ref) VALUES ({r[0]},{esc(r[1])},{esc(r[2])},{r[3] or 0},{r[4] or 'NULL'});\n")
rows=con.execute("SELECT sharh_book_id,kitab_no,kitab_title,bab_no,bab_title,seq,para,text FROM sharh_segment ORDER BY seq").fetchall(); con.close()
fi=1
for bi in range(0,len(rows),60):
    with open(f"{out}/{fi:05d}.sql","w") as f:
        for r in rows[bi:bi+60]:
            f.write(f"INSERT INTO sharh_segment (sharh_book_id,kitab_no,kitab_title,bab_no,bab_title,seq,para,text) VALUES ({r[0]},{r[1]},{esc(r[2])},{r[3]},{esc(r[4])},{r[5]},{r[6]},{esc(r[7])});\n")
    fi+=1
print(f"{len(rows)} sharh + turath_book → {fi} fail")
PY
for f in "$OUT"/000.sql "$OUT"/[0-9][0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  for a in 1 2 3 4 5; do npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null 2>&1 && break; [ "$a" = 5 ] && echo "gagal $(basename $f)" || sleep $((a*3)); done
done
echo "OK sharh re-sync D1"
