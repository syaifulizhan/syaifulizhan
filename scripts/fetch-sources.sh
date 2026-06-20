#!/usr/bin/env bash
# Muat turun dataset sumber ke data/ (di-gitignore). Idempoten.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data && cd data

clone() { # repo dir
  if [ -d "$2" ]; then echo "• $2 sudah ada"; else
    echo "↓ clone $2 ..."; git clone --depth 1 "$1" "$2"
    rm -rf "$2/.git"
  fi
}

clone https://github.com/AhmedBaset/hadith-json.git   hadith-json    # teks AR+EN (17 kitab)
clone https://github.com/ceefour/sanad-hadith.git     sanad-hadith   # darjat + isnad (9 kitab)
# Fasa B (perawi/graf) — buka bila perlu:
# clone https://github.com/R3GENESI5/Itqan.git        Itqan          # ~115k perawi + graf

echo "Sumber sedia di data/"
