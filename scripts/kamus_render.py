#!/usr/bin/env python3
"""Render halaman Kamus Istilah Hadis (PDF imbasan) → PNG untuk vision OCR.
Guna: python3 scripts/kamus_render.py [mula] [tamat]   (indeks halaman 0-based)
Contoh: python3 scripts/kamus_render.py 38 60
"""
import fitz, os, sys

SRC = "data/kamus.pdf"
OUT = "data/kamus/pages"

if not os.path.exists(SRC):
    sys.exit(f"✗ {SRC} tiada. Download PDF kamus ke situ dahulu.")

os.makedirs(OUT, exist_ok=True)
doc = fitz.open(SRC)
n = len(doc)
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end = int(sys.argv[2]) if len(sys.argv) > 2 else n
end = min(end, n)

for i in range(start, end):
    pix = doc[i].get_pixmap(dpi=150)  # 150 DPI cukup utk OCR teks imbasan
    pix.save(f"{OUT}/page-{i+1:04d}.png")

print(f"✓ Render halaman {start+1}..{end} daripada {n} → {OUT}/")
