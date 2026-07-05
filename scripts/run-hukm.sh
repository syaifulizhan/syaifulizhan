#!/usr/bin/env bash
# Jalankan fetch hukm dorar (buku UTAMA lengkap) HINGGA HABIS — BOOSTER concurrent
# (~29 hadis/s, ~40 min) + sync D1 akhir. Dijejak harness → beritahu bila habis.
# Resumable (checkpoint). Ketepatan sama (matnQuery+parse tak berubah).
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=/private/tmp/claude-502/-Users-syaifulizhan/da78efba-f60d-4e28-a9f2-bc0e2f8fe96e/scratchpad/bulk-major.log

echo "→ Mula fetch hukm --major-only concurrency 30 $(date)"
node --env-file=.env.local scripts/fetch-dorar-rulings.mjs --major-only --concurrency 30 --delay 0 --write >> "$LOG" 2>&1
echo "→ Fetch selesai — sync D1 penuh $(date)"
bash scripts/sync-rulings-d1.sh >> "$LOG" 2>&1 || true
echo "✓ SEMUA HUKM (buku UTAMA) SELESAI + D1 synced $(date)"
