#!/usr/bin/env bash
# Re-sync korpus tempatan (data/corpus.db) → Turso cloud (dewan-hadis).
# Jana dump bersih (buang FTS shadow + writable_schema, DROP dahulu, cipta semula FTS),
# kemudian muat ke Turso. Jalankan selepas corpus:build bila nak segarkan tapak live.
#   bash scripts/turso-sync.sh [nama-db] [--force]
#
# ⚠️ MAHAL: sync penuh = DROP + reinsert ~1.4M baris = ~1.4M+ writes SETIAP KALI.
# Free plan Turso had 10M writes/bulan. JANGAN jalankan berulang tanpa sebab —
# itu punca had tercapai (15.7M) dulu. Secara lalai skrip BANDING dulu; tulis HANYA
# bila ada beza DAN awak beri --force. (Glosari dah pindah ke D1, bukan Turso.)
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-dewan-hadis}"
FORCE=""; for a in "$@"; do [ "$a" = "--force" ] && FORCE=1; done
OUT=/tmp/turso_sync.sql

# ── Preflight: banding kiraan lokal vs remote (READ sahaja, tiada writes) ──
# Guna TURSO_SYNC_URL/TOKEN dari env kalau diberi (cth akaun baharu tanpa CLI login);
# jika tidak, ambil dari turso CLI (akaun yg sedang login).
SYNC_URL="${TURSO_SYNC_URL:-$(turso db show "$DB" --url)}"
SYNC_TOKEN="${TURSO_SYNC_TOKEN:-$(turso db tokens create "$DB")}"
DIFF_FILE="${DIFF_OUT:-/tmp/turso_diff.txt}"
# FORCE_TABLES: paksa sync jadual tertentu walau kiraan sama (cth perubahan ISI hadith_narrators).
if [ -n "${FORCE_TABLES:-}" ]; then
  echo "→ FORCE_TABLES=$FORCE_TABLES — langkau preflight kiraan, sync jadual ini (perubahan isi)."
  printf '%s\n' "$FORCE_TABLES" | tr ',' '\n' > "$DIFF_FILE"
  FORCE=1
else
  echo "→ Preflight: banding corpus.db vs Turso ($DB) ..."
  if TURSO_SYNC_URL="$SYNC_URL" TURSO_SYNC_TOKEN="$SYNC_TOKEN" node scripts/turso-precheck.mjs; then
    echo "✓ Turso '$DB' SUDAH selari dgn corpus.db — tiada perubahan, 0 writes. Berhenti."
    exit 0
  fi
fi
if [ -z "$FORCE" ]; then
  echo
  echo "⚠ Ada BEZA. Sync penuh akan DROP+reinsert ~1.4M baris (mahal pada had writes 10M/bulan)."
  echo "  Kalau betul-betul nak tulis semula, jalankan dgn --force:"
  echo "    bash scripts/turso-sync.sh $DB --force"
  exit 2
fi
echo "→ --force diberi. Sync TERPILIH (jadual beza sahaja) ..."

# ── GUARD HAD PERIBADI: tolak kalau usage (atau + anggaran) > 9.5M (elak pecah 10M) ──
if ! TURSO_API_TOKEN="${TURSO_API_TOKEN:-$(grep '^TURSO_API_TOKEN=' .env.local 2>/dev/null | cut -d= -f2-)}" node scripts/turso-usage-guard.mjs; then
  echo "⛔ BATAL sync — melebihi had peribadi Turso. TIADA apa ditulis."
  exit 4
fi

# Jadual yg beza dari preflight (default: semua korpus kalau fail tiada)
DIFF_FILE="${DIFF_OUT:-/tmp/turso_diff.txt}"
SYNC_TABLES="$(tr '\n' ',' < "$DIFF_FILE" 2>/dev/null | sed 's/,$//')"
echo "  jadual akan ditulis semula: ${SYNC_TABLES:-<semua>}"

echo "→ Jana dump bersih dari data/corpus.db ..."
SYNC_TABLES="$SYNC_TABLES" python3 - "$OUT" <<'PY'
import sqlite3, re, sys, os
out = sys.argv[1]
sel = [t for t in os.environ.get("SYNC_TABLES", "").split(",") if t]
# Skop Turso = PERAWI/ISNAD SAHAJA. books/hadiths/translations/glossary = D1.
TURSO = ["narrators", "narrator_grades", "narrator_relations", "hadith_narrators"]
# Jadual yg TAK patut ada di Turso lagi (dah pindah D1/Supabase) → buang kalau ada.
LEGACY = ["hadiths", "books", "translations", "glossary", "topics", "authors", "meta", "hadiths_fts"]
tables = [t for t in (sel or TURSO) if t in TURSO]   # tapis: hanya jadual Turso sah
con = sqlite3.connect("data/corpus.db")
fts = re.compile(r'''(CREATE (VIRTUAL )?TABLE|INSERT INTO|CREATE TRIGGER)\s+['"]?\w*_fts''')
with open(out, "w") as f:
    f.write("PRAGMA foreign_keys=OFF;\n")
    # Bersihkan legasi D1/Supabase dari Turso (DROP = ubah skema, ~0 row-write)
    for t in LEGACY:
        f.write(f"DROP TABLE IF EXISTS {t};\n")
    # DROP jadual Turso yg nak ditulis semula (anak-dulu)
    if "narrators" in tables: f.write("DROP TABLE IF EXISTS narrators_fts;\n")
    for t in ["narrator_relations", "hadith_narrators", "narrator_grades", "narrators"]:
        if t in tables: f.write(f"DROP TABLE IF EXISTS {t};\n")
    for line in con.iterdump():
        if fts.search(line) or "writable_schema" in line:
            continue
        m = re.match(r'\s*(?:CREATE TABLE|INSERT INTO)\s+"?(\w+)"?', line)
        if m and m.group(1) not in tables:   # hanya jadual Turso terpilih
            continue
        line = re.sub(r"REFERENCES\s+\w+\s*\([^)]*\)", "", line)
        f.write(line + "\n")
    if "narrators" in tables:
        f.write("CREATE VIRTUAL TABLE IF NOT EXISTS narrators_fts USING fts5(name_search, content='narrators', content_rowid='id');\n")
        f.write("INSERT INTO narrators_fts(narrators_fts) VALUES('rebuild');\n")
con.close()
print(f"  dump: {out} (tulis: {', '.join(tables) or 'tiada'} | buang legasi: {', '.join(LEGACY[:7])})")
PY

echo "→ Muat ke Turso ($DB) via loader Node berkelompok (tahan muatan besar) ..."
TURSO_SYNC_URL="$SYNC_URL" TURSO_SYNC_TOKEN="$SYNC_TOKEN" \
  node scripts/turso-load.mjs "$OUT"
rm -f "$OUT"
echo "✓ Re-sync selesai."
