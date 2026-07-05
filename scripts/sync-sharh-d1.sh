#!/usr/bin/env bash
# Sync sharh_segment (كتاب→باب→huraian) dari data/corpus.db → D1. Buang turath_page
# lama (tak perlu — pembaca standalone dibuang; papar guna segmen). Idempoten.
#   bash scripts/sync-sharh-d1.sh <sharh_book_id> [db]
set -euo pipefail
cd "$(dirname "$0")/.."
SBID="${1:?guna: sync-sharh-d1.sh <sharh_book_id> [db]}"
DB="${2:-dewan-hadis}"
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL sharh_segment #$SBID ..."
python3 - "$OUTDIR" "$SBID" <<'PY'
import sqlite3, sys
outdir, sbid = sys.argv[1], int(sys.argv[2])
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
rows = con.execute("SELECT seq,kitab_no,kitab_title,bab_no,bab_title,para,text FROM sharh_segment WHERE sharh_book_id=? ORDER BY seq", (sbid,)).fetchall()
con.close()
with open(f"{outdir}/000.sql","w") as f:
    f.write("DROP TABLE IF EXISTS sharh_segment;\n")  # jadual DATA-JANA (bukan pemilik-edit) — selamat drop
    f.write("CREATE TABLE sharh_segment (sharh_book_id INTEGER, kitab_no INTEGER, kitab_title TEXT, bab_no INTEGER, bab_title TEXT, seq INTEGER, para INTEGER, text TEXT);\n")
    f.write("CREATE INDEX idx_sseg ON sharh_segment(sharh_book_id, kitab_no, seq);\n")
    f.write("DROP TABLE IF EXISTS turath_page;\n")  # pembaca standalone dibuang
BATCH=60; fi=1
for bi in range(0,len(rows),BATCH):
    with open(f"{outdir}/{fi:04d}.sql","w") as f:
        for seq,kn,kt,bn,bt,pa,tx in rows[bi:bi+BATCH]:
            f.write(f"INSERT INTO sharh_segment (sharh_book_id,kitab_no,kitab_title,bab_no,bab_title,seq,para,text) VALUES ({sbid},{kn},{esc(kt)},{bn},{esc(bt)},{seq},{pa},{esc(tx)});\n")
    fi+=1
print(f"  {len(rows)} segmen → {fi} fail")
PY

echo "→ Muat ke D1 ($DB) ..."
for f in "$OUTDIR"/000.sql "$OUTDIR"/[0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
done
echo "✓ sharh_segment #$SBID di D1."
