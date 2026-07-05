#!/usr/bin/env bash
# Sync hadith_ruling (dorar) → D1. RESUMABLE + retry (elak gagal separuh pada 1M+ baris).
# Langkau hadis yg SUDAH di D1 (additive) → re-jalan sambung yang tertinggal. IDEMPOTEN.
#   bash scripts/sync-rulings-d1.sh [nama-db]
set -uo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
OUTDIR="$(mktemp -d)"; trap 'rm -rf "$OUTDIR"' EXIT

echo "→ Semak hadis yg SUDAH ada di D1 ..."
npx wrangler d1 execute "$DB" --remote --command "SELECT DISTINCT hadith_id FROM hadith_ruling" --json 2>/dev/null \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(str(r['hadith_id']) for r in d[0]['results']))" > "$OUTDIR/have.txt" || true
echo "  sudah di D1: $(wc -l < "$OUTDIR/have.txt" 2>/dev/null || echo 0) hadis"

echo "→ Jana SQL utk hadis yg BELUM di D1 ..."
python3 - "$OUTDIR" <<'PY'
import sqlite3, sys
outdir = sys.argv[1]
have = set()
try:
    with open(f"{outdir}/have.txt") as f:
        have = {int(x) for x in f.read().split() if x.strip()}
except FileNotFoundError: pass
con = sqlite3.connect("data/corpus.db")
def esc(v): return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"
COLS = "hadith_id,rawi,muhaddith,source_book,ref,hukm,is_primary,ord,source,fetched_at"
rows = [r for r in con.execute(f"SELECT {COLS} FROM hadith_ruling ORDER BY hadith_id, ord") if r[0] not in have]
con.close()
BATCH = 1000
fi = 1
for bi in range(0, len(rows), BATCH):
    with open(f"{outdir}/{fi:05d}.sql", "w") as f:
        for r in rows[bi:bi+BATCH]:
            f.write(f"INSERT INTO hadith_ruling ({COLS}) VALUES ({','.join(esc(v) for v in r)});\n")
    fi += 1
print(f"  {len(rows)} baris BARU · {fi-1} fail (batch {BATCH})")
PY

echo "→ Muat ke D1 ($DB) dgn retry ..."
ok=0; fail=0
for f in "$OUTDIR"/[0-9][0-9][0-9][0-9][0-9].sql; do
  [ -f "$f" ] || continue
  for att in 1 2 3 4 5; do
    if npx wrangler d1 execute "$DB" --remote --file "$f" >/dev/null 2>&1; then ok=$((ok+1)); break; fi
    if [ "$att" = 5 ]; then fail=$((fail+1)); echo "  ⚠ gagal kekal: $(basename "$f")"; else sleep $((att*3)); fi
  done
done
echo "✓ hadith_ruling D1: $ok fail OK, $fail gagal kekal."
