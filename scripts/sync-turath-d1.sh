#!/usr/bin/env bash
# Sync kitab turath (teks penuh syarah) dari data/corpus.db → Cloudflare D1.
# Idempoten (DELETE book dulu). book_ref = book_id hadis yg disyarah (nullable).
#   bash scripts/sync-turath-d1.sh <turath_id> [book_ref] [nama-db]
set -euo pipefail
cd "$(dirname "$0")/.."
TID="${1:?guna: sync-turath-d1.sh <turath_id> [book_ref] [db]}"
REF="${2:-NULL}"
DB="${3:-dewan-hadis}"
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL turath #$TID ..."
python3 - "$OUTDIR" "$TID" "$REF" <<'PY'
import sqlite3, sys, os
outdir, tid, ref = sys.argv[1], int(sys.argv[2]), sys.argv[3]
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
b = con.execute("SELECT id,name,author,info,npages FROM turath_book WHERE id=?", (tid,)).fetchone()
pages = con.execute("SELECT idx,vol,page,text FROM turath_page WHERE book_id=? ORDER BY idx", (tid,)).fetchall()
con.close()
with open(f"{outdir}/000_book.sql","w") as f:
    f.write(f"DELETE FROM turath_page WHERE book_id={tid};\n")
    f.write(f"DELETE FROM turath_book WHERE id={tid};\n")
    f.write(f"INSERT INTO turath_book (id,name,author,info,npages,book_ref) VALUES ({tid},{esc(b[1])},{esc(b[2])},{esc(b[3])},{b[4]},{ref});\n")
BATCH=100; fi=1
for bi in range(0,len(pages),BATCH):
    with open(f"{outdir}/{fi:04d}.sql","w") as f:
        for idx,vol,page,text in pages[bi:bi+BATCH]:
            f.write(f"INSERT INTO turath_page (book_id,idx,vol,page,text) VALUES ({tid},{idx},{esc(vol)},{page if page is not None else 'NULL'},{esc(text)});\n")
    fi+=1
print(f"  {len(pages)} halaman → {fi} fail")
PY

echo "→ Muat ke D1 ($DB) ..."
for f in "$OUTDIR"/000_book.sql "$OUTDIR"/[0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
done
echo "✓ turath #$TID di D1."
