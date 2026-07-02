#!/usr/bin/env bash
# Muat glosari Kamus al-Ghouri (source='kamus-ghouri') dari data/corpus.db
# → Cloudflare D1 (dewan-hadis). DELETE dulu, INSERT semula berkelompok. IDEMPOTEN.
# Jalankan selepas: vision-kamus.py (OCR) → build-glossary-vision.py --write.
#   bash scripts/glossary-d1-sync.sh [nama-db] [--dry]
# Laman live baca D1 terus → entri baharu naik tanpa perlu deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
DRY=""; [ "${2:-}" = "--dry" ] && DRY=1
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL dari data/corpus.db (kamus-ghouri) ..."
python3 - "$OUTDIR" <<'PY'
import sqlite3, sys, os
outdir = sys.argv[1]
con = sqlite3.connect("data/corpus.db")
COLS = "term_ar,huruf,term_search,translit,term_ms,term_en,def_ar,def_ms,def_en"
rows = con.execute(f"SELECT {COLS} FROM glossary WHERE source='kamus-ghouri'").fetchall()
con.close()
def esc(v):
    return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
BATCH = 200  # statement per fail (elak fail terlalu besar utk wrangler)
# fail 0: bersihkan dulu
with open(f"{outdir}/000.sql", "w") as f:
    f.write("DELETE FROM glossary WHERE source='kamus-ghouri';\n")
n = 0
for bi in range(0, len(rows), BATCH):
    with open(f"{outdir}/{bi//BATCH+1:03d}.sql", "w") as f:
        for r in rows[bi:bi+BATCH]:
            vals = ",".join(esc(v) for v in r)
            f.write(f"INSERT INTO glossary ({COLS},source) VALUES ({vals},'kamus-ghouri');\n")
            n += 1
print(f"  {n} baris dalam {len(os.listdir(outdir))} fail (batch {BATCH})")
PY

if [ -n "$DRY" ]; then
  echo "(dry) fail SQL di $OUTDIR — tidak dimuat ke D1."
  cp -r "$OUTDIR" /tmp/glossary_d1_dry && echo "  salinan: /tmp/glossary_d1_dry"
  exit 0
fi

echo "→ Muat ke D1 ($DB) ikut susunan (DELETE dulu, kemudian INSERT) ..."
for f in "$OUTDIR"/*.sql; do
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
  echo "  ✓ $(basename "$f")"
done
echo "✓ Glosari D1 dikemaskini."
