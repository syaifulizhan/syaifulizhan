#!/usr/bin/env python3
"""OCR pukal Kamus Istilah Hadis (data/kamus.pdf) guna easyocr.
Render + OCR per halaman (tiada PNG bertimbun — jimat cakera). Resumable.
Output: data/kamus/ocr/page-NNNN.txt
  python3 scripts/kamus_ocr.py [mula] [tamat]   (indeks 0-based; lalai 38..608 = bahagian glosari)
"""
import os, sys, io
import fitz
import easyocr

SRC = "data/kamus.pdf"
OUT = "data/kamus/ocr"
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(SRC)
start = int(sys.argv[1]) if len(sys.argv) > 1 else 38
end = int(sys.argv[2]) if len(sys.argv) > 2 else min(609, len(doc))

print("Memuat model easyocr (ar+en)...", flush=True)
reader = easyocr.Reader(["ar", "en"], gpu=False, verbose=False)

done = 0
for i in range(start, end):
    out = f"{OUT}/page-{i+1:04d}.txt"
    if os.path.exists(out):
        continue
    pix = doc[i].get_pixmap(dpi=220)
    res = reader.readtext(pix.tobytes("png"), detail=0, paragraph=True)
    with open(out, "w") as f:
        f.write("\n".join(res))
    done += 1
    if done % 5 == 0:
        print(f"  OCR hlm {i+1} (siap {done})", flush=True)
print(f"✓ OCR selesai {start+1}..{end} (baharu: {done}) → {OUT}/", flush=True)
