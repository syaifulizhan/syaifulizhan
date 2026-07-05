# Ekstrak kitab syarah turath → sharh_segment (كتاب→باب→huraian) GENERIK (mana-mana syarah).
# Jajar ikut TAJUK كتاب (kitab_norm) — robust merentas metodologi berbeza (Fath al-Bari 1:1
# tertib; Nawawi tajuk berlari masuk huraian). AMANAH: guna title span, bukan teka prosa.
#   python3 scripts/extract-sharh.py <turath_id> [--write]
import sqlite3, re, sys

SBID = int(sys.argv[1])
WRITE = "--write" in sys.argv
con = sqlite3.connect("data/corpus.db")
rows = con.execute("SELECT idx, text FROM turath_page WHERE book_id=? ORDER BY idx", (SBID,)).fetchall()

TITLE = re.compile(r'<span[^>]*data-type\s*=\s*["\']?title["\']?[^>]*>(.*?)</span>', re.S)
strip_tags = lambda s: re.sub(r"<[^>]+>", "", s)
def norm(s):
    s = re.sub(r"[ً-ْٰ]", "", s or "")
    return re.sub(r"\s+", " ", s.replace("ة","ه").replace("ى","ي").replace("أ","ا").replace("إ","ا").replace("آ","ا").replace("(","").replace(")","")).strip()

# kitab_norm: ambil "كتاب X…" TAPI potong bila jumpa penanda huraian (قوله/[/nombor/ﷺ/عن)
def kitab_key(title):
    t = norm(title)
    m = re.match(r"(كتاب\s+[؀-ۿ\s]+?)(?:\s+(?:قوله|قال|عن|حدثنا|باب|فيه|وفيه|اجمع|هذا)\b|\s*\[|\s*[\d٠-٩]|\s*ﷺ|$)", t)
    return (m.group(1).strip() if m else t)[:60]

def clean_body(s):
    s = re.sub(r'<span[^>]*data-type\s*=\s*["\']?footnote["\']?[^>]*>.*?</span>', " ", s, flags=re.S)
    s = re.sub(r"~[\d٠-٩]+-[\d٠-٩]+", " ", s)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()

segs = []; cur_kt_no = 0; cur_kt_title = None; cur_kt_norm = None; cur = None
def flush():
    global cur
    if cur and cur["parts"]:
        cur["text"] = clean_body(" ".join(cur["parts"])); del cur["parts"]
        if cur["text"]: segs.append(cur)
    cur = None
for idx, t in rows:
    t = t or ""; last = 0
    for m in TITLE.finditer(t):
        if cur is not None: cur["parts"].append(t[last:m.start()])
        last = m.end()
        title = re.sub(r"\s+", " ", strip_tags(m.group(1))).strip()
        tn = norm(title)
        is_kitab = bool(re.match(r"(?:[\d٠-٩]+\s*-\s*)?كتاب\s", tn))
        is_bab = (not is_kitab) and bool(re.match(r"(?:[\d٠-٩]+\s*-\s*)?باب", tn))
        if is_kitab:
            flush(); cur_kt_no += 1
            cur_kt_title = re.sub(r"^[\d٠-٩]+\s*-\s*", "", title); cur_kt_norm = kitab_key(title)
            cur = {"kitab_no": cur_kt_no, "kitab_title": cur_kt_title, "kitab_norm": cur_kt_norm, "bab_no": 0, "bab_title": None, "parts": []}
        elif is_bab and cur_kt_norm:
            flush()
            bn = sum(1 for s in segs if s["kitab_norm"] == cur_kt_norm and s["bab_no"] > 0) + 1
            cur = {"kitab_no": cur_kt_no, "kitab_title": cur_kt_title, "kitab_norm": cur_kt_norm, "bab_no": bn, "bab_title": re.sub(r"^[\d٠-٩]+\s*-\s*", "", title), "parts": []}
    if cur is not None: cur["parts"].append(t[last:])
flush()

nk = len(set(s["kitab_norm"] for s in segs)); nb = sum(1 for s in segs if s["bab_no"] > 0)
print(f"segmen: {len(segs)} | كتاب unik: {nk} | باب: {nb}")
print("كتاب:", sorted(set(s["kitab_norm"] for s in segs))[:6])

if not WRITE: print("\n(DRY)"); con.close(); sys.exit(0)
# skema + ketul
cols = con.execute("PRAGMA table_info(sharh_segment)").fetchall()
if not any(c[1]=="kitab_norm" for c in cols):
    con.execute("DROP TABLE IF EXISTS sharh_segment")
    con.execute("CREATE TABLE sharh_segment (sharh_book_id INTEGER, kitab_no INTEGER, kitab_title TEXT, kitab_norm TEXT, bab_no INTEGER, bab_title TEXT, seq INTEGER PRIMARY KEY AUTOINCREMENT, para INTEGER, text TEXT)")
con.execute("DELETE FROM sharh_segment WHERE sharh_book_id=?", (SBID,))
def chunks(t, size=6000):
    if len(t) <= size: return [t]
    out, i = [], 0
    while i < len(t):
        j = min(i+size, len(t))
        if j < len(t):
            k = max(t.rfind("۔",i,j), t.rfind(".",i,j), t.rfind("﴾",i,j), t.rfind("؟",i,j))
            if k > i+size//2: j = k+1
        out.append(t[i:j].strip()); i = j
    return [c for c in out if c]
n = 0
for s in segs:
    for pi, ch in enumerate(chunks(s["text"])):
        con.execute("INSERT INTO sharh_segment (sharh_book_id,kitab_no,kitab_title,kitab_norm,bab_no,bab_title,para,text) VALUES (?,?,?,?,?,?,?,?)",
                    (SBID, s["kitab_no"], s["kitab_title"], s["kitab_norm"], s["bab_no"], s["bab_title"], pi, ch)); n += 1
con.commit(); print(f"\n✓ {len(segs)} segmen ({n} baris) disimpan.")
con.close()
