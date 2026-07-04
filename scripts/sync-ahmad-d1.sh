#!/usr/bin/env bash
# Sync Musnad Ahmad al-Maknaz (book_id 900002) dari data/corpus.db → Cloudflare D1 (dewan-hadis).
# Buang Ahmad lama (hadiths + translations), masuk set penuh 26,363 + terjemahan dipadan.
# IDEMPOTEN (DELETE ikut book_id/julat dulu). Laman baca D1 live → naik tanpa deploy.
#   bash scripts/sync-ahmad-d1.sh [nama-db] [--dry]
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
DRY=""; [ "${2:-}" = "--dry" ] && DRY=1
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Jana SQL dari data/corpus.db (Ahmad book_id=900002) ..."
python3 - "$OUTDIR" <<'PY'
import sqlite3, sys, os
outdir = sys.argv[1]
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"

# 000: bersih Ahmad lama (hadiths ikut book_id; translations ikut julat id lama 9127-10500)
with open(f"{outdir}/000_del.sql", "w") as f:
    f.write("DELETE FROM translations WHERE entity_type='hadith' AND entity_id BETWEEN 9127 AND 10500;\n")
    f.write("DELETE FROM hadiths WHERE book_id=900002;\n")

# hadiths (skema D1: id,src_ref,book_id,chapter_ref,chapter_ar,number,matn_ar,matn_search,grade)
hcols = "id,src_ref,book_id,chapter_ref,chapter_ar,number,matn_ar,matn_search,grade"
rows = con.execute(f"SELECT {hcols} FROM hadiths WHERE book_id=900002 ORDER BY id").fetchall()
BATCH = 400; fi = 1
for bi in range(0, len(rows), BATCH):
    with open(f"{outdir}/{fi:03d}_had.sql", "w") as f:
        for r in rows[bi:bi+BATCH]:
            f.write(f"INSERT INTO hadiths ({hcols}) VALUES ({','.join(esc(v) for v in r)});\n")
    fi += 1
print(f"  hadiths: {len(rows)} baris")

# translations Ahmad (entity_id = id baharu 60623+)
tcols = "entity_type,entity_id,lang,text,source,is_verified"
tr = con.execute(f"""SELECT {tcols} FROM translations
    WHERE entity_type='hadith' AND entity_id IN (SELECT id FROM hadiths WHERE book_id=900002)""").fetchall()
tfi = 1
for bi in range(0, len(tr), BATCH):
    with open(f"{outdir}/{tfi:03d}_trn.sql", "w") as f:
        for r in tr[bi:bi+BATCH]:
            f.write(f"INSERT INTO translations ({tcols}) VALUES ({','.join(esc(v) for v in r)});\n")
    tfi += 1
print(f"  translations: {len(tr)} baris")
con.close()
PY

if [ -n "$DRY" ]; then
  echo "(dry) fail SQL di $OUTDIR"; cp -r "$OUTDIR" /tmp/ahmad_d1_dry && echo "  salinan: /tmp/ahmad_d1_dry"; exit 0
fi

echo "→ Muat ke D1 ($DB): DELETE dulu, kemudian INSERT ikut susunan ..."
# 000 delete dulu, kemudian had, kemudian trn
for f in "$OUTDIR"/000_del.sql "$OUTDIR"/*_had.sql "$OUTDIR"/*_trn.sql; do
  [ -f "$f" ] || continue
  npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null
  echo "  ✓ $(basename "$f")"
done
echo "✓ Ahmad D1 dikemaskini."
