#!/usr/bin/env bash
# Jalankan fetch hukm dorar (buku UTAMA lengkap) HINGGA HABIS + sync D1 berkala.
# Dijejak harness (run_in_background) → beritahu bila habis. Resumable (checkpoint).
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=/private/tmp/claude-502/-Users-syaifulizhan/da78efba-f60d-4e28-a9f2-bc0e2f8fe96e/scratchpad/bulk-major.log

echo "→ Mula fetch hukm --major-only $(date)"
node --env-file=.env.local scripts/fetch-dorar-rulings.mjs --major-only --delay 1300 --write >> "$LOG" 2>&1 &
FPID=$!

# sync D1 setiap 6 jam semasa fetch berjalan (had writes D1); + sync akhir
while kill -0 "$FPID" 2>/dev/null; do
  sleep 21600 &  # 6 jam
  wait $! 2>/dev/null
  kill -0 "$FPID" 2>/dev/null || break
  echo "→ Sync D1 berkala $(date)"; bash scripts/sync-rulings-d1.sh >> "$LOG" 2>&1 || true
done
wait "$FPID" 2>/dev/null
echo "→ Fetch selesai — sync D1 akhir $(date)"
bash scripts/sync-rulings-d1.sh >> "$LOG" 2>&1 || true
echo "✓ SEMUA HUKM (buku UTAMA) SELESAI + D1 synced $(date)"
