#!/usr/bin/env bash
# Sync hadith_ruling (dorar) dari data/corpus.db → Cloudflare D1 (dewan-hadis).
# Hanya hadis yg BELUM ada di D1 diproses (INSERT tambahan), atau --refresh utk hadis
# tertentu (DELETE+INSERT). IDEMPOTEN. Laman baca D1 live → naik tanpa deploy.
#   bash scripts/sync-rulings-d1.sh [nama-db] [--dry]
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
DRY=""; [ "${2:-}" = "--dry" ] && DRY=1
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL hadith_ruling dari data/corpus.db ..."
python3 - "$OUTDIR" <<'PY'
import sqlite3, sys, os
outdir = sys.argv[1]
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
COLS = "hadith_id,rawi,muhaddith,source_book,ref,hukm,is_primary,ord,source,fetched_at"
rows = con.execute(f"SELECT {COLS} FROM hadith_ruling ORDER BY hadith_id, ord").fetchall()
hids = sorted({r[0] for r in rows})
con.close()
# 000: buang ruling sedia ada utk hadis-hadis ini (idempoten), kemudian INSERT
BATCH = 300
with open(f"{outdir}/000_del.sql", "w") as f:
    for i in range(0, len(hids), 400):
        chunk = ",".join(str(h) for h in hids[i:i+400])
        f.write(f"DELETE FROM hadith_ruling WHERE hadith_id IN ({chunk});\n")
fi = 1
for bi in range(0, len(rows), BATCH):
    with open(f"{outdir}/{fi:04d}.sql", "w") as f:
        for r in rows[bi:bi+BATCH]:
            f.write(f"INSERT INTO hadith_ruling ({COLS}) VALUES ({','.join(esc(v) for v in r)});\n")
    fi += 1
print(f"  {len(rows)} baris hukm · {len(hids)} hadis")
PY

if [ -n "$DRY" ]; then echo "(dry) $OUTDIR"; cp -r "$OUTDIR" /tmp/rulings_d1_dry; echo "  /tmp/rulings_d1_dry"; exit 0; fi
echo "→ Muat ke D1 ($DB): DELETE dulu, kemudian INSERT ..."
for f in "$OUTDIR"/000_del.sql "$OUTDIR"/[0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
done
echo "✓ hadith_ruling D1 dikemaskini."
