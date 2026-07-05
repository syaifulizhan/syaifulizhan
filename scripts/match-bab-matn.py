# #16 — Petakan hadis KITA → باب ikut PADANAN MATAN (bukan nombor — nombor AhmedBaset
# tak jajar عبد الباقي). Sumber باب+matan: turath صحيح البخاري 1681 (ط السلطانية).
# Kaedah: 6-gram matan turath → undi hadis KITA (matan proper stabil antara edisi; isnad
# beza jadi tak mengundi). Terima HANYA jika undi kuat + margin jelas (AMANAH: ragu=langkau).
#   python3 scripts/match-bab-matn.py <turath_id> <our_book_id> [--write]
import sqlite3, re, sys

TID = int(sys.argv[1]); OUR = int(sys.argv[2]); WRITE = "--write" in sys.argv
LOOSE = "--loose" in sys.argv  # syarah tanpa nombor hadis (cth Nawawi) — kesan ikut حدثنا sahaja
con = sqlite3.connect("data/corpus.db")
def norm(s):
    s = re.sub(r"[ً-ْٰـ]", "", s or "")
    s = re.sub(r"[إأآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    return re.sub(r"[^ء-ي ]", " ", re.sub(r"\s+", " ", s)).strip()
def grams(words, n=6):
    return [" ".join(words[i:i+n]) for i in range(len(words)-n+1)]

TITLE = re.compile(r'<span[^>]*data-type\s*=\s*["\']?title["\']?[^>]*>(.*?)</span>', re.S)
strip_tags = lambda s: re.sub(r"<[^>]+>", "", s)
STRIP = re.compile(r"[ً-ْٰـ]")

# 1) walk turath 1681 → item (kitab, bab, matn) ikut turutan
rows = con.execute("SELECT idx,text FROM turath_page WHERE book_id=? ORDER BY idx", (TID,)).fetchall()
markers = []; buf = ""
for idx, t in rows:
    t = STRIP.sub("", t or ""); last = 0
    for m in TITLE.finditer(t):
        buf += t[last:m.start()]; last = m.end()
        markers.append((len(buf), re.sub(r"\s+", " ", strip_tags(m.group(1))).strip()))
    buf += t[last:]
HAD = re.compile(r'(?<![ء-ي])(حدثنا|حدثني|اخبرنا|اخبرني)' if LOOSE
                 else r'(?<![\d٠-٩])([\d٠-٩]{1,4})\s*-\s*(حدثنا|حدثني|اخبرنا|اخبرني)')
def title_at(pos):
    kt = bb = None; cnt = {}
    for mp, tv in markers:
        if mp > pos: break
        tvn = norm(tv)
        if re.match(r"كتاب\s", tvn): kt = tv; bb = None; cnt[kt] = 0
        elif re.match(r"باب", tvn): bb = tv; cnt[kt] = cnt.get(kt, 0) + 1
    return kt, bb, (cnt.get(kt, 0) if kt else 0)
hs = [(m.start(),) for m in HAD.finditer(buf)]
items = []
for i, (pos,) in enumerate(hs):
    end = hs[i+1][0] if i+1 < len(hs) else len(buf)
    kt, bb, bn = title_at(pos)
    if bb: items.append({"kitab": kt, "bab": bb, "bab_no": bn, "matn": norm(buf[pos:end])})
print(f"turath: {len(items)} hadis ber-باب")

# 2) indeks 6-gram → hadis KITA
ours = con.execute("SELECT id, matn_ar FROM hadiths WHERE book_id=?", (OUR,)).fetchall()
idx = {}
for hid, matn in ours:
    for g in set(grams(norm(matn).split())):
        idx.setdefault(g, []).append(hid)
print(f"hadis KITA: {len(ours)} · 6-gram unik: {len(idx)}")

# 3) padan: undi + margin
assign = {}   # hadith_id → (kitab, bab_no, bab)  (ambil undi TERTINGGI jika berlaga)
score = {}
acc = amb = 0
for it in items:
    votes = {}
    for g in grams(it["matn"].split()):
        hs2 = idx.get(g)
        if hs2 and len(hs2) <= 3:  # 6-gram distinktif sahaja (elak frasa lazim)
            for hid in hs2: votes[hid] = votes.get(hid, 0) + 1
    if not votes: continue
    rank = sorted(votes.items(), key=lambda x: -x[1])
    best, bv = rank[0]
    sv = rank[1][1] if len(rank) > 1 else 0
    if bv >= 4 and bv >= 2 * sv + 2:   # kuat + margin jelas
        if best not in score or bv > score[best]:
            assign[best] = (it["kitab"], it["bab_no"], it["bab"]); score[best] = bv
        acc += 1
    else: amb += 1
print(f"padanan diterima: {acc} · kabur(langkau): {amb} · hadis KITA ber-باب: {len(assign)}")
# sahih sampel
for num in [1, 8, 50]:
    r = con.execute("SELECT id FROM hadiths WHERE book_id=? AND number=?", (OUR, num)).fetchone()
    if r and r[0] in assign: print(f"  #{num} → {assign[r[0]][2][:46]}")
    elif r: print(f"  #{num} → (tiada padanan)")

if not WRITE: print("\n(DRY)"); con.close(); sys.exit(0)
con.execute("CREATE TABLE IF NOT EXISTS hadith_bab (hadith_id INTEGER PRIMARY KEY, kitab_title TEXT, bab_no INTEGER, bab_title TEXT)")
con.execute("DELETE FROM hadith_bab WHERE hadith_id IN (SELECT id FROM hadiths WHERE book_id=?)", (OUR,))
for hid, (kt, bn, bt) in assign.items():
    con.execute("INSERT OR REPLACE INTO hadith_bab (hadith_id,kitab_title,bab_no,bab_title) VALUES (?,?,?,?)", (hid, kt, bn, bt))
con.commit(); print(f"\n✓ {len(assign)} hadith→باب disimpan (LOKAL).")
con.close()
