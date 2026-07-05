# Ekstrak Fath al-Bari (turath 1673) → jadual sharh_segment: كتاب→باب→huraian.
# AMANAH: guna title span BERNOMBOR (97 كتاب sepadan Bukhari, 3916 باب) — bukan teka
# sempadan hadis dari prosa. Setiap باب = satu segmen huraian (melekat pada باب betul).
#   python3 scripts/extract-fathbari.py [--write]
import sqlite3, re, sys

WRITE = "--write" in sys.argv
SBID = 1673
con = sqlite3.connect("data/corpus.db")
rows = con.execute("SELECT idx, text FROM turath_page WHERE book_id=? ORDER BY idx", (SBID,)).fetchall()

TITLE = re.compile(r'<span[^>]*data-type\s*=\s*["\']?title["\']?[^>]*>(.*?)</span>', re.S)
strip_tags = lambda s: re.sub(r"<[^>]+>", "", s)
norm = lambda s: re.sub(r"[ً-ْٰ]", "", s or "")

def clean_body(s):
    s = re.sub(r'<span[^>]*data-type\s*=\s*["\']?footnote["\']?[^>]*>.*?</span>', " ", s, flags=re.S)
    s = re.sub(r"~[\d٠-٩]+-[\d٠-٩]+", " ", s)         # penanda halaman
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()

# tanda setiap title span dgn placeholder unik supaya boleh split sambil kekal teks badan
segs = []  # {kitab_no,kitab_title,bab_no,bab_title,parts:[]}
cur_kitab_no = 0; cur_kitab_title = None
cur = None
def flush():
    global cur
    if cur and (cur["parts"] or cur["bab_title"]):
        cur["text"] = clean_body(" ".join(cur["parts"]))
        del cur["parts"]
        segs.append(cur)
    cur = None

for idx, t in rows:
    t = t or ""
    last = 0
    for m in TITLE.finditer(t):
        # teks SEBELUM title ini → milik segmen semasa
        if cur is not None:
            cur["parts"].append(t[last:m.start()])
        last = m.end()
        title = re.sub(r"\s+", " ", strip_tags(m.group(1))).strip()
        tn = norm(title)
        is_kitab = bool(re.search(r"(?:^|[\s\-])كتاب\s", tn)) and "باب" not in tn.split("كتاب")[0]
        is_bab = (not is_kitab) and bool(re.search(r"(?:^|[\s\-])باب", tn))
        if is_kitab:
            flush()
            cur_kitab_no += 1
            cur_kitab_title = re.sub(r"^[\d٠-٩]+\s*-\s*", "", title)
            # كتاب mula: buka segmen 'mukadimah كتاب' (bab_no 0)
            cur = {"kitab_no": cur_kitab_no, "kitab_title": cur_kitab_title, "bab_no": 0, "bab_title": None, "parts": []}
        elif is_bab:
            flush()
            bt = re.sub(r"^[\d٠-٩]+\s*-\s*", "", title)
            bn = (segs[-1]["bab_no"] + 1) if (segs and segs[-1]["kitab_no"] == cur_kitab_no and cur and cur["bab_no"]) else 1
            # nombor باب: kira dlm كتاب semasa
            bn = sum(1 for s in segs if s["kitab_no"] == cur_kitab_no and s["bab_no"] > 0) + 1
            cur = {"kitab_no": cur_kitab_no, "kitab_title": cur_kitab_title, "bab_no": bn, "bab_title": bt, "parts": []}
        # (title lain diabai — tetap dlm badan)
    if cur is not None:
        cur["parts"].append(t[last:])
flush()

con2 = [s for s in segs if s.get("text")]
n_kitab = len(set(s["kitab_no"] for s in con2))
n_bab = sum(1 for s in con2 if s["bab_no"] > 0)
print(f"segmen: {len(con2)} | كتاب: {n_kitab} | باب: {n_bab}")
# sampel sahih: كتاب 2 (الإيمان) باب 1 (بني الإسلام) — huraian patut tentang 5 rukun
for s in con2:
    if s["kitab_no"] == 2 and s["bab_no"] == 1:
        print(f"\n[SAMPEL] كتاب {s['kitab_no']} {s['kitab_title']} · باب {s['bab_no']} {s['bab_title']}")
        print("huraian:", s["text"][:260]); break

if not WRITE:
    print("\n(DRY — --write utk simpan)"); con.close(); sys.exit(0)

con.execute("DROP TABLE IF EXISTS sharh_segment")
con.execute("""CREATE TABLE sharh_segment (
  sharh_book_id INTEGER, kitab_no INTEGER, kitab_title TEXT, bab_no INTEGER,
  bab_title TEXT, seq INTEGER PRIMARY KEY AUTOINCREMENT, para INTEGER, text TEXT)""")

# pecah teks besar → ketulan ~6KB di sempadan ayat (elak had statement D1; papar kemas)
def chunks(t, size=6000):
    if len(t) <= size: return [t]
    out, i = [], 0
    while i < len(t):
        j = min(i + size, len(t))
        if j < len(t):
            k = max(t.rfind("۔", i, j), t.rfind(".", i, j), t.rfind("﴾", i, j), t.rfind("؟", i, j), t.rfind("!", i, j))
            if k > i + size // 2: j = k + 1
        out.append(t[i:j].strip()); i = j
    return [c for c in out if c]

n = 0
for s in con2:
    for pi, ch in enumerate(chunks(s["text"])):
        con.execute("INSERT INTO sharh_segment (sharh_book_id,kitab_no,kitab_title,bab_no,bab_title,para,text) VALUES (?,?,?,?,?,?,?)",
                    (SBID, s["kitab_no"], s["kitab_title"], s["bab_no"], s["bab_title"], pi, ch))
        n += 1
con.commit()
print(f"\n✓ {len(con2)} segmen ({n} baris berketul) disimpan (LOKAL).")
con.close()
