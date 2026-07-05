#!/usr/bin/env bash
# Sync data syarah Muslim → D1 (append-safe + retry): sharh_segment 1711 (Nawawi),
# turath_book book_ref, hadith_bab penuh (Bukhari+Muslim). Data-JANA. IDEMPOTEN.
set -uo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

echo "→ Jana SQL ..."
python3 - "$OUT" <<'PY'
import sqlite3, sys
out = sys.argv[1]; con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
# 1) sharh_segment 1711 (append: DELETE 1711 dulu, kekal FB 1673)
with open(f"{out}/000.sql","w") as f:
    f.write("CREATE TABLE IF NOT EXISTS turath_book (id INTEGER PRIMARY KEY, name TEXT, author TEXT, info TEXT, npages INTEGER, fetched_at TEXT, book_ref INTEGER);\n")
    f.write("DELETE FROM sharh_segment WHERE sharh_book_id=1711;\n")
    f.write("DELETE FROM turath_book WHERE id=1711;\n")
    f.write("DELETE FROM hadith_bab;\n")
    bk = con.execute("SELECT id,name,author,npages,book_ref FROM turath_book WHERE id=1711").fetchone()
    if bk: f.write(f"INSERT INTO turath_book (id,name,author,npages,book_ref) VALUES ({bk[0]},{esc(bk[1])},{esc(bk[2])},{bk[3] or 0},900007);\n")
rows = con.execute("SELECT kitab_no,kitab_title,bab_no,bab_title,seq,para,text FROM sharh_segment WHERE sharh_book_id=1711 ORDER BY seq").fetchall()
fi=1
for bi in range(0,len(rows),60):
    with open(f"{out}/{fi:05d}.sql","w") as f:
        for kn,kt,bn,bt,seq,pa,tx in rows[bi:bi+60]:
            f.write(f"INSERT INTO sharh_segment (sharh_book_id,kitab_no,kitab_title,bab_no,bab_title,seq,para,text) VALUES (1711,{kn},{esc(kt)},{bn},{esc(bt)},{seq},{pa},{esc(tx)});\n")
    fi+=1
# 3) hadith_bab penuh
hb = con.execute("SELECT hadith_id,kitab_title,bab_no,bab_title FROM hadith_bab").fetchall()
for bi in range(0,len(hb),400):
    with open(f"{out}/{fi:05d}.sql","w") as f:
        for hid,kt,bn,bt in hb[bi:bi+400]:
            f.write(f"INSERT INTO hadith_bab (hadith_id,kitab_title,bab_no,bab_title) VALUES ({hid},{esc(kt)},{bn},{esc(bt)});\n")
    fi+=1
con.close()
print(f"  sharh 1711: {len(rows)} · hadith_bab: {len(hb)} · {fi} fail")
PY

echo "→ Muat ke D1 ($DB) dgn retry ..."
for f in "$OUT"/000.sql "$OUT"/[0-9][0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  for att in 1 2 3 4 5; do
    npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null 2>&1 && break
    [ "$att" = 5 ] && echo "  ⚠ gagal: $(basename "$f")" || sleep $((att*3))
  done
done
echo "✓ data Muslim di D1."
