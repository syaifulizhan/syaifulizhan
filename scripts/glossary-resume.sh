#!/usr/bin/env bash
# Sambung & siapkan glosari Kamus al-Ghouri dalam SATU arahan. Selamat diulang
# (idempoten) — buat kemajuan setakat kuota Gemini izinkan; jalankan lagi bila reset.
#   bash scripts/glossary-resume.sh
# Prasyarat: .env.local ada GEMINI_API_KEY (+ _2 kalau ada), wrangler login.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "════ [1/3] OCR halaman baki (fitz 30–572; langkau yang dah cached) ════"
python3 scripts/vision-kamus.py 30 572 || true   # cap harian → berhenti elegan, jangan halang langkah seterusnya

echo "════ [2/3] Agregasi cache → data/corpus.db (kamus-ghouri) ════"
python3 scripts/build-glossary-vision.py --write

echo "════ [3/3] Sync glosari → Cloudflare D1 live ════"
bash scripts/glossary-d1-sync.sh

CACHED=$(python3 -c "import os;print(sum(1 for i in range(30,573) if os.path.exists(f'data/kamus-vision/p{i:04d}.json')))")
echo "✓ SIAP. Cached $CACHED/543 halaman. Semak live: https://syaifulizhan.my/glosari"
