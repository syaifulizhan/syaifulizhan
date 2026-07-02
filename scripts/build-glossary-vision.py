#!/usr/bin/env python3
"""Agregasi cache vision-kamus → entri glosari bersih → corpus.db.
Cantum fragmen sambungan, kira huruf dari term_ar, dedup, hati-hati.
Tulis corpus.db sahaja (source='kamus-ghouri'); D1 langkah berasingan bersahkan.
  python3 scripts/build-glossary-vision.py [--write]
"""
import json, glob, re, sys, sqlite3

# Semua huruf hijaiyah selepas buang 'ال' (Alif–Ya), supaya tiada istilah gugur
TEN = set("ابتثجحخدذرزسشصضطظعغفقكلمنهوي")
HARAKAT = re.compile(r'[ً-ْـٰ]')
def norm(s):
    if not s: return ""
    s = HARAKAT.sub('', s)
    s = s.translate(str.maketrans("آأإىئؤة", "اااييوه"))
    return re.sub(r'\s+', ' ', s).strip()
def huruf_of(term):
    # buang harakat sahaja dulu (KEKAL beza hamza أ/إ/آ vs alif biasa ا)
    t = HARAKAT.sub('', term or '')
    t = re.sub(r'^[«»\"\'\(\)\s]+', '', t)
    # buang kata sandang HANYA jika alif biasa (ا+ل), bukan hamza (أل/إل/آل)
    # supaya perkataan spt أَلْفَاظ، أَلْقَاب، أَلَيْسَ kekal di huruf Alif
    if t.startswith('ال'):
        t = t[2:]
    n = norm(t)
    return n[0] if n else ""

def main():
    write = "--write" in sys.argv
    files = sorted(glob.glob("data/kamus-vision/p*.json"))
    raw = []
    for f in files:
        try: page = json.load(open(f))
        except Exception: continue
        for e in page:
            raw.append(e)
    print(f"halaman: {len(files)}, objek mentah: {len(raw)}")

    # cantum fragmen sambungan (term_ar null/kosong → sambung def ke entri sebelum)
    merged = []
    for e in raw:
        t = (e.get("term_ar") or "").strip()
        if not t and merged:
            merged[-1]["def_ms"] = (merged[-1].get("def_ms") or "") + " " + (e.get("def_ms") or "")
            if e.get("def_ar"):
                merged[-1]["def_ar"] = (merged[-1].get("def_ar") or "") + " " + e["def_ar"]
            continue
        if not t:
            continue
        merged.append(dict(e))
    print(f"selepas cantum fragmen: {len(merged)}")

    # bina + dedup ikut term_search; tapis huruf hijaiyah sah
    seen = {}
    drop_letter = 0
    for e in merged:
        term = e["term_ar"].strip()
        ts = norm(term)
        h = huruf_of(term)
        if h not in TEN:
            drop_letter += 1; continue
        rec = {
            "term_ar": term, "huruf": h, "term_search": ts,
            "translit": (e.get("translit") or "").strip() or None,
            "term_ms": (e.get("term_ms") or "").strip() or None,
            "def_ms": re.sub(r'\s+', ' ', (e.get("def_ms") or "")).strip() or None,
            "def_ar": re.sub(r'\s+', ' ', (e.get("def_ar") or "")).strip() or None,
        }
        if ts in seen:
            # simpan yang def lebih panjang
            if len(rec["def_ms"] or "") > len(seen[ts]["def_ms"] or ""):
                seen[ts] = rec
        else:
            seen[ts] = rec
    ents = list(seen.values())
    print(f"selepas tapis huruf hijaiyah (buang {drop_letter} bukan-huruf) + dedup: {len(ents)} entri unik")
    from collections import Counter
    c = Counter(e["huruf"] for e in ents)
    print("agihan huruf:", " ".join(f"{k}:{v}" for k, v in sorted(c.items())))
    print("\n=== 4 sampel ===")
    for e in ents[:4]:
        print(f"• [{e['huruf']}] {e['term_ar']} ({e['translit']}) — {e['term_ms']}")
        print(f"   BM: {(e['def_ms'] or '')[:130]}")

    if not write:
        print("\n(dry — guna --write untuk simpan ke corpus.db)"); return
    con = sqlite3.connect("data/corpus.db")
    con.execute("DELETE FROM glossary WHERE source IN ('kamus-ocr','kamus-ai','kamus-ai-flag')")
    con.execute("DELETE FROM glossary WHERE source='kamus-ghouri'")  # re-run bersih
    n = 0
    for e in ents:
        con.execute("""INSERT OR IGNORE INTO glossary
            (term_ar,huruf,term_search,translit,term_ms,term_en,def_ar,def_ms,def_en,source)
            VALUES (?,?,?,?,?,NULL,?,?,NULL,'kamus-ghouri')""",
            (e["term_ar"], e["huruf"], e["term_search"], e["translit"], e["term_ms"], e["def_ar"], e["def_ms"]))
        n += con.total_changes and 1 or 0
    con.commit()
    tot = con.execute("SELECT count(*) FROM glossary").fetchone()[0]
    bysrc = con.execute("SELECT source,count(*) FROM glossary GROUP BY source").fetchall()
    print(f"\n✓ ditulis. glossary corpus.db: {tot} jumlah | {dict(bysrc)}")
    con.close()

if __name__ == "__main__":
    main()
