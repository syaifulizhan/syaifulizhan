# Ekstrak struktur باب dari turath base kitab (cth صحيح البخاري 1681) → petakan hadis KITA
# → باب. AMANAH: padan ikut MATN ternormal (bukan teka posisi). Walk pages, jejak كتاب+باب
# (title span), setiap hadis "N - حدثنا {matn}" dipadan ke hadith KITA.
#   python3 scripts/extract-bab.py <turath_id> <our_book_id> [--write]
import sqlite3, re, sys

TID = int(sys.argv[1]); OUR = int(sys.argv[2]); WRITE = "--write" in sys.argv
con = sqlite3.connect("data/corpus.db")
def norm(s):
    s = re.sub(r"[ً-ْٰـ]", "", s or "")
    s = re.sub(r"[إأآٱ]", "ا", s).replace("ى","ي").replace("ة","ه").replace("ؤ","و").replace("ئ","ي")
    return re.sub(r"[^ء-ي ]", " ", re.sub(r"\s+", " ", s)).strip()

TITLE = re.compile(r'<span[^>]*data-type\s*=\s*["\']?title["\']?[^>]*>(.*?)</span>', re.S)
strip_tags = lambda s: re.sub(r"<[^>]+>", "", s)

# 1) walk turath pages → senarai (kitab_title, bab_no, bab_title, hadith_matn_norm)
rows = con.execute("SELECT idx,text FROM turath_page WHERE book_id=? ORDER BY idx", (TID,)).fetchall()
items = []  # {kitab, bab_no, bab, matn_norm}
cur_kitab = None; cur_bab = None; cur_bab_no = 0; kitab_bab = {}
# gabung teks (buang title span jadi penanda), tapi kita perlu urutan → proses ikut token
full_parts = []
markers = []  # (pos_type, value)
buf = ""
STRIP_TASH = re.compile(r"[ً-ْٰـ]")
for idx, t in rows:
    t = STRIP_TASH.sub("", t or "")  # buang tashkeel (kekal HTML+huruf) — padanan konsisten
    last = 0
    for m in TITLE.finditer(t):
        buf += t[last:m.start()]; last = m.end()
        title = re.sub(r"\s+"," ",strip_tags(m.group(1))).strip()
        markers.append((len(buf), "title", title));
    buf += t[last:]
# pisah hadis dlm buf ikut corak "N - حدثنا/حدثني/أخبرنا" (nombor hadis)
HAD = re.compile(r'(?<![\d٠-٩])([\d٠-٩]{1,4})\s*-\s*(حدثنا|حدثني|اخبرنا|اخبرني)')
def title_at(pos):
    # كتاب/باب terkini sebelum pos
    kt=bb=bn=None; kbcount={}
    for mp, _, tv in markers:
        if mp>pos: break
        tvn=norm(tv)
        if re.match(r'كتاب\s',tvn): kt=tv; bb=None; kbcount[kt]=0
        elif re.match(r'باب',tvn): bb=tv; kbcount[kt]=kbcount.get(kt,0)+1; bn=kbcount[kt]
    return kt,bb,bn
hs=[(m.start(), m.group(1)) for m in HAD.finditer(buf)]
for i,(pos,num) in enumerate(hs):
    end = hs[i+1][0] if i+1<len(hs) else len(buf)
    matn = norm(buf[pos:end])[:320]  # awalan (isnad+matn) utk padan silang-edisi
    kt,bb,bn = title_at(pos)
    if bb: items.append({"num":num,"kitab":kt,"bab":bb,"bab_no":bn,"matn":matn})
print(f"turath: {len(items)} hadis ber-باب dikesan")

# 2) padan ke hadis KITA ikut NOMBOR (turath N = عبد الباقي = nombor AhmedBaset utk Bukhari),
#    SAHKAN dgn awalan matn (elak salah-padan bila penomboran drift).
def ar2int(s):
    tr = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
    try: return int(s.translate(tr))
    except: return None
ours = con.execute("SELECT id, chapter_ar, matn_ar, number FROM hadiths WHERE book_id=? AND number IS NOT NULL", (OUR,)).fetchall()
kw = lambda s: norm(s).replace("كتاب","").strip()
by_num = {int(num): (hid, kw(ch or ""), norm(matn)) for hid, ch, matn, num in ours}
def grams(s, n=5):
    w = s.split(); return {" ".join(w[i:i+n]) for i in range(len(w)-n+1)}
matched = ver_k = ver_m = 0; assign = []
for it in items:
    n = ar2int(it["num"])
    if n is None or n not in by_num: continue
    hid, our_kitab, our_matn = by_num[n]
    matched += 1
    tk = kw(it["kitab"] or "")
    kitab_ok = bool(our_kitab and tk and (our_kitab in tk or tk in our_kitab or our_kitab[:8] == tk[:8]))
    # tindih matn: >=2 5-gram turath muncul dlm matn kita (sahkan nombor JAJAR ke hadis betul)
    tg = grams(it["matn"]); og = grams(our_matn[:600])
    matn_ok = len(tg & og) >= 2
    if kitab_ok: ver_k += 1
    if matn_ok: ver_m += 1
    if kitab_ok or matn_ok: assign.append((hid, it["kitab"], it["bab_no"], it["bab"]))
print(f"padan nombor: {matched}/{len(items)} · sah كتاب: {ver_k} · sah matn: {ver_m} · DITERIMA: {len(assign)} (hadis kita: {len(ours)})")
for a in assign[:4]: print("  ✓ hadith",a[0],"→",a[3][:45])

if not WRITE: print("\n(DRY)"); con.close(); sys.exit(0)
con.execute("CREATE TABLE IF NOT EXISTS hadith_bab (hadith_id INTEGER PRIMARY KEY, kitab_title TEXT, bab_no INTEGER, bab_title TEXT)")
con.execute("DELETE FROM hadith_bab WHERE hadith_id IN (SELECT id FROM hadiths WHERE book_id=?)", (OUR,))
for hid,kt,bn,bt in assign:
    con.execute("INSERT OR REPLACE INTO hadith_bab (hadith_id,kitab_title,bab_no,bab_title) VALUES (?,?,?,?)", (hid,kt,bn,bt))
con.commit(); print(f"\n✓ {len(assign)} hadith→باب disimpan (LOKAL).")
con.close()
