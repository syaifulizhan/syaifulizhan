# Analisis struktur Fath al-Bari (turath 1673): title span كتاب/باب + penanda hadis.
# Tujuan: sahkan boleh ekstrak كتاب→باب→huraian utk syarah inline (amanah, bukan teka).
import sqlite3, re, sys

con = sqlite3.connect("data/corpus.db")
rows = con.execute("SELECT idx, text FROM turath_page WHERE book_id=1673 ORDER BY idx").fetchall()
con.close()

# regex title span TOLERAN (apa-apa atribut, apa-apa quote)
TITLE = re.compile(r'<span[^>]*data-type\s*=\s*["\']?title["\']?[^>]*>(.*?)</span>', re.S)
strip = lambda s: re.sub(r"<[^>]+>", "", s)
norm = lambda s: re.sub(r"[ً-ْٰ]", "", s)  # buang tashkeel

n_title = n_kitab = n_bab = 0
kitab_titles, bab_sample = [], []
for idx, t in rows:
    for m in TITLE.finditer(t or ""):
        title = re.sub(r"\s+", " ", strip(m.group(1))).strip()
        if not title:
            continue
        n_title += 1
        tn = norm(title)
        # كتاب: "N - كتاب ..." ; باب: "N - باب ..."
        if re.search(r"(?:^|\s)كتاب\s", tn) and "باب" not in tn.split("كتاب")[0]:
            n_kitab += 1
            if len(kitab_titles) < 100:
                kitab_titles.append((idx, title))
        elif re.search(r"(?:^|\s)باب", tn):
            n_bab += 1
            if len(bab_sample) < 5:
                bab_sample.append((idx, title))

print(f"title span: {n_title} | كتاب: {n_kitab} | باب: {n_bab}")
print("\n5 كتاب pertama:")
for idx, t in kitab_titles[:5]:
    print(f"  idx{idx}: {t}")
print("5 باب pertama:")
for idx, t in bab_sample:
    print(f"  idx{idx}: {t}")

# penanda hadis: cari nombor hadis Bukhari dlm huraian (cth [رقم] / (رقم) / حديث رقم)
full = " ".join(strip(t or "") for _, t in rows)
for pat, lbl in [(r"\[\s*[\d٠-٩]+\s*\]", "[N] kurungan"),
                 (r"طرفه في\s*:?\s*[\d٠-٩]+", "طرفه في N (rujuk silang)"),
                 (r"الحديث\s+[\d٠-٩]+", "الحديث N")]:
    print(f"penanda '{lbl}': {len(re.findall(pat, full))}")
