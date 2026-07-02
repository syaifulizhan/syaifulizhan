#!/usr/bin/env python3
"""Vision-OCR Kamus Istilah Hadis (al-Ghouri) via Gemini 2.5-flash.
Transkrip SETIA perkataan al-Ghouri (Arab + BM) berstruktur, satu pass.
Cache per halaman (resume). Tulis cache sahaja; agregasi+D1 langkah berasingan.

Sokong BERBILANG kunci (kuota 2x): letak dalam .env.local —
  GEMINI_API_KEY=...        (kunci 1)
  GEMINI_API_KEY_2=...      (kunci 2, 3, ... ikut suka)
  atau GEMINI_API_KEYS=k1,k2,k3
Setiap kunci ada pacing tersendiri → throughput naik ikut bilangan kunci.
Bila satu kunci kena daily-cap ia dilangkau; berhenti elegan bila SEMUA capped.

  python3 scripts/vision-kamus.py <start_fitz> <end_fitz>
"""
import base64, json, urllib.request, re, sys, time, os, threading, itertools
from concurrent.futures import ThreadPoolExecutor
import fitz

def load_keys():
    env = open('.env.local').read()
    keys = re.findall(r'^\s*GEMINI_API_KEY(?:_\d+)?=(\S+)', env, re.M)
    m = re.search(r'^\s*GEMINI_API_KEYS=(\S+)', env, re.M)
    if m: keys += [k for k in m.group(1).split(',') if k]
    seen, out = set(), []
    for k in keys:
        if k not in seen: seen.add(k); out.append(k)
    if not out: raise SystemExit("Tiada GEMINI_API_KEY dalam .env.local")
    return out

KEYS = load_keys()
# Pilihan: hadkan kepada SATU kunci (indeks arg ke-3) — utk bahagi muka surat
# antara dua proses selari (setiap proses satu kunci, julat berbeza).
if len(sys.argv) > 3:
    KEYS = [KEYS[int(sys.argv[3]) % len(KEYS)]]
MODEL = "gemini-2.5-flash"
URLS = [f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={k}" for k in KEYS]
NK = len(KEYS)
CACHE = "data/kamus-vision"; os.makedirs(CACHE, exist_ok=True)
PDF = "data/kamus.pdf"
DPI = 135
WORKERS = max(2, 2 * NK)
INTERVAL = 5.0  # saat antara MULA permintaan PER KUNCI

# pacing per-kunci
_locks = [threading.Lock() for _ in range(NK)]
_next = [0.0] * NK
def pace(ki):
    with _locks[ki]:
        now = time.time()
        wait = max(0.0, _next[ki] - now)
        _next[ki] = max(now, _next[ki]) + INTERVAL
    if wait > 0: time.sleep(wait)

# pemilih kunci round-robin yang melangkau kunci yang dah capped
_rr = itertools.count()
_capped = set()
_kplock = threading.Lock()
def pick_key():
    with _kplock:
        for _ in range(NK):
            ki = next(_rr) % NK
            if ki not in _capped:
                return ki
    return None  # semua capped

PROMPT = """Ini satu halaman "Kamus Istilah Hadis" — terjemahan Melayu kitab معجم المصطلحات الحديثية oleh al-Ghouri. Dua lajur: Arab di kanan, Melayu di kiri (sepadan).

Ekstrak SETIAP entri istilah hadis pada halaman ini. Satu entri = satu istilah Arab (headword) + definisinya. Untuk setiap entri pulangkan objek:
- term_ar: istilah Arab headword (transkrip TEPAT dengan baris/harakat, JANGAN reka)
- translit: transliterasi rumi istilah
- term_ms: nama/makna ringkas Melayu (headword Melayu)
- def_ms: definisi Melayu LENGKAP (transkrip VERBATIM dari teks; gabung bahagian 'Dari sudut bahasa', 'Dari sudut istilah', contoh, dll; JANGAN terjemah semula atau ringkaskan)
- def_ar: definisi Arab lengkap dari lajur kanan jika ada (transkrip tepat), atau null

PERATURAN:
- Hanya TRANSKRIPSI teks yang ada; JANGAN cipta makna/ayat baharu.
- Gabung sub-bahagian (lughah/istilah/contoh/hukum) satu entri = satu istilah.
- ABAIKAN kepala/kaki halaman, nombor halaman, tajuk 'HURUF ...'.
- Jika satu entri bersambung dari halaman sebelum (tiada headword Arab jelas di atas), tetap ekstrak apa yang ada dengan term_ar null.
Pulangkan JSON array objek sahaja."""

def classify_429(body_bytes):
    """Pulang (daily, delay). daily=True bila had HARIAN (PerDay) habis →
    kunci itu patut di-cap terus walau retryDelay pendek (Google bagi 43s palsu)."""
    daily = False; delay = 22.0
    try:
        j = json.loads(body_bytes)
        for d in j.get("error", {}).get("details", []):
            if "retryDelay" in d:
                delay = float(str(d["retryDelay"]).rstrip("s")) + 2
            for v in d.get("violations", []):
                if "PerDay" in (v.get("quotaId") or ""):
                    daily = True
    except Exception: pass
    return daily, delay

_stop = threading.Event()   # SEMUA kunci capped → henti elegan, sambung bila reset
def call_gemini(png_b64, tries=6):
    body = json.dumps({
        "contents": [{"parts": [{"text": PROMPT}, {"inline_data": {"mime_type": "image/png", "data": png_b64}}]}],
        "generationConfig": {"temperature": 0, "response_mime_type": "application/json"},
    }).encode()
    for k in range(tries):
        if _stop.is_set(): return None
        ki = pick_key()
        if ki is None:
            print("    ⛔ SEMUA kunci DAILY-CAP — berhenti, sambung bila reset", flush=True)
            _stop.set(); return None
        pace(ki)
        try:
            r = urllib.request.urlopen(urllib.request.Request(URLS[ki], body, {"Content-Type": "application/json"}), timeout=150)
            return json.loads(json.load(r)["candidates"][0]["content"]["parts"][0]["text"])
        except urllib.error.HTTPError as e:
            if e.code == 429:
                daily, w = classify_429(e.read())
                if daily or w > 120:   # had harian habis untuk kunci ini
                    with _kplock: _capped.add(ki)
                    print(f"    ⛔ kunci#{ki+1} DAILY-CAP (PerDay) — langkau kunci itu", flush=True)
                    continue  # cuba kunci lain serta-merta
                time.sleep(w); continue
            time.sleep(8)
        except Exception:
            time.sleep(8)
    return None

_cnt = {"done": 0, "err": 0, "ent": 0}
_clock = threading.Lock()
_rlock = threading.Lock()
_doc = [None]
def work(i):
    if _stop.is_set(): return  # semua kunci dah cap → jangan render/ spam GAGAL
    cf = f"{CACHE}/p{i:04d}.json"
    with _rlock:
        png_b64 = base64.b64encode(_doc[0][i].get_pixmap(dpi=DPI).tobytes("png")).decode()
    ents = call_gemini(png_b64)
    with _clock:
        if ents is None:
            _cnt["err"] += 1; print(f"  fitz[{i}] GAGAL", flush=True); return
        json.dump(ents, open(cf, "w"), ensure_ascii=False)
        _cnt["done"] += 1; _cnt["ent"] += len(ents)
        print(f"  fitz[{i}] (cetak {i+1}): {len(ents)} entri  [jum {_cnt['ent']}, siap {_cnt['done']}, gagal {_cnt['err']}]", flush=True)

def main():
    a, b = int(sys.argv[1]), int(sys.argv[2])
    _doc[0] = fitz.open(PDF)
    todo = []
    skip = 0
    for i in range(a, b + 1):
        cf = f"{CACHE}/p{i:04d}.json"
        if os.path.exists(cf):
            try: json.load(open(cf)); skip += 1; continue
            except Exception: pass
        todo.append(i)
    print(f"julat {a}-{b}: {len(todo)} perlu proses, {skip} dah cached, {NK} kunci, {WORKERS} worker", flush=True)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, todo))
    print(f"\n✓ SIAP julat {a}-{b}: {_cnt['done']} halaman, {_cnt['ent']} entri mentah, {_cnt['err']} gagal", flush=True)

if __name__ == "__main__":
    main()
