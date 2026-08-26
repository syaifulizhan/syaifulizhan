#!/usr/bin/env python3
"""Bina korpus BERSATU (D1 + Turso + lokal) → satu fail SQLite untuk seed Turso.

Kenapa: korpus terbelah D1 (kandungan) / Turso (perawi+syarah) / lokal (superset
separa). Belahan itu punca bug hidup — cth `getSharahForKitab` baca turath_book
dari Turso tapi sharh_segment dari D1 yang SUDAH di-DROP → syarah kosong.

Kaedah SELAMAT (elak kesalahan lama 15.7M writes):
  fail ini di-seed ke Turso via `turso db create --from-file` = UPLOAD fail,
  BUKAN INSERT per baris → **0 rows_written**. Disahkan empirik 26 Ogos 2026
  (probe 50k baris + indeks → usage kekal 0/10M).

Asas   : data/corpus.db (superset perawi/isnad/syarah/turath_page)
Delta  : jadual yang D1 ke depan (dieksport via `wrangler d1 export --table`)

  python3 scripts/build-unified-corpus.py <out.db> [--d1-ruling <sql>] [--d1-override <sql>]
"""
import argparse, os, shutil, sqlite3, subprocess, sys, tempfile

SRC = "data/corpus.db"


def log(m): print(f"  {m}", flush=True)


def load_dump(path: str, tag: str) -> str:
    """Sedia fail SQLite dari dump D1 → pulangkan laluannya.

    Terima `.db` yang SUDAH dimuat (langkau terus) atau `.sql` mentah. Muatan
    .sql dibungkus dalam SATU transaksi — tanpa itu 1.1M INSERT ambil >10 minit.
    """
    if path.endswith(".db"):
        return path
    tmp = os.path.join(tempfile.gettempdir(), f"d1cmp-{tag}.db")
    if os.path.exists(tmp):
        os.remove(tmp)
    log(f"  muat {path} → {tmp} ...")
    sql = f"PRAGMA journal_mode=OFF;\nPRAGMA synchronous=OFF;\nBEGIN;\n.read {path}\nCOMMIT;\n"
    subprocess.run(["sqlite3", tmp], input=sql, text=True, check=True, capture_output=True)
    return tmp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--d1-ruling", help="dump hadith_ruling dari D1")
    ap.add_argument("--d1-override", help="dump hadith_sanad_override dari D1")
    a = ap.parse_args()

    if not os.path.exists(SRC):
        sys.exit(f"✗ {SRC} tiada")
    if os.path.exists(a.out):
        sys.exit(f"✗ {a.out} sudah wujud — padam dahulu (elak tulis atas kerja lama)")

    log(f"salin {SRC} → {a.out} ({os.path.getsize(SRC)/1e6:.0f} MB) ...")
    shutil.copy2(SRC, a.out)

    con = sqlite3.connect(a.out)
    before = {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
              for t in ("hadith_ruling", "hadith_sanad_override", "glossary")}

    # ── Delta 1: hadith_ruling — D1 ke depan (sync resumable jalan terus ke D1) ──
    if a.d1_ruling:
        log("gabung hadith_ruling dari D1 ...")
        d1 = load_dump(a.d1_ruling, "ruling")
        con.execute("ATTACH ? AS d1", (d1,))
        # Kunci unik: (hadith_id, muhaddith, source_book, ref) — sama macam UNIQUE constraint.
        # ⚠️ D1 TIADA constraint UNIQUE (dibuang utk sync resumable append-safe) →
        # D1 boleh ada PENDUA. GROUP BY kunci unik supaya satu baris sahaja masuk;
        # jadual lokal ada UNIQUE(hadith_id,muhaddith,source_book,ref) yg akan tolak selebihnya.
        # Indeks dahulu — tanpa ia anti-join 1.1M×1.1M ambil >10 minit.
        con.execute("CREATE INDEX IF NOT EXISTS d1.idx_cmp ON hadith_ruling(hadith_id, muhaddith, source_book, ref)")
        dup = con.execute("""
            SELECT count(*) FROM (SELECT hadith_id, muhaddith, source_book, ref
                                  FROM d1.hadith_ruling
                                  GROUP BY 1,2,3,4 HAVING count(*) > 1)""").fetchone()[0]
        log(f"  kunci berpendua dalam D1: {dup:,}")
        con.execute("""
            INSERT INTO hadith_ruling (hadith_id, rawi, muhaddith, source_book, ref, hukm,
                                       is_primary, sharh_id, ord, source, fetched_at, dorar_id)
            SELECT d.hadith_id, d.rawi, d.muhaddith, d.source_book, d.ref, d.hukm,
                   d.is_primary, d.sharh_id, d.ord, d.source, d.fetched_at, d.dorar_id
            FROM (SELECT * FROM d1.hadith_ruling GROUP BY hadith_id, muhaddith, source_book, ref) d
            WHERE NOT EXISTS (
              SELECT 1 FROM main.hadith_ruling m
              WHERE m.hadith_id=d.hadith_id AND m.muhaddith IS d.muhaddith
                AND m.source_book IS d.source_book AND m.ref IS d.ref)
        """)
        # Amanah: pastikan tiada baris LOKAL yang hilang dari D1 (dwiarah).
        only_local = con.execute("""
            SELECT count(*) FROM main.hadith_ruling m WHERE NOT EXISTS (
              SELECT 1 FROM d1.hadith_ruling d
              WHERE d.hadith_id=m.hadith_id AND d.muhaddith IS m.muhaddith
                AND d.source_book IS m.source_book AND d.ref IS m.ref)""").fetchone()[0]
        log(f"  baris lokal-sahaja (dikekalkan): {only_local:,}")
        con.commit()
        con.execute("DETACH d1")

    # ── Delta 2: hadith_sanad_override — suntingan admin hidup di D1 ──
    # ⚠️ D1 ada baris UJIAN (hadith_id 999999, edited_by='test') — JANGAN bawa masuk.
    if a.d1_override:
        log("gabung hadith_sanad_override dari D1 (buang baris ujian) ...")
        d1 = load_dump(a.d1_override, "override")
        con.execute("ATTACH ? AS d1", (d1,))
        con.execute("""
            INSERT OR REPLACE INTO hadith_sanad_override (hadith_id, nodes_json, edited_by, edited_at)
            SELECT hadith_id, nodes_json, edited_by, edited_at FROM d1.hadith_sanad_override
            WHERE edited_by IS NOT 'test' AND hadith_id IN (SELECT id FROM main.hadiths)
        """)
        con.commit()
        con.execute("DETACH d1")

    after = {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
             for t in ("hadith_ruling", "hadith_sanad_override", "glossary")}
    for t in before:
        d = after[t] - before[t]
        log(f"{t:24} {before[t]:>9,} → {after[t]:>9,}  ({d:+,})")

    log("semak integriti ...")
    chk = con.execute("PRAGMA integrity_check").fetchone()[0]
    if chk != "ok":
        sys.exit(f"✗ integrity_check: {chk}")
    log("  integrity_check: ok")

    # FTS mesti selari dgn jadual induk (carian perawi + hadis bergantung padanya).
    for fts, base in (("narrators_fts", "narrators"), ("hadiths_fts", "hadiths")):
        n = con.execute(f"SELECT count(*) FROM {fts}").fetchone()[0]
        b = con.execute(f"SELECT count(*) FROM {base}").fetchone()[0]
        log(f"  {fts}: {n:,} vs {base}: {b:,} {'✓' if n == b else '✗ TAK SELARI'}")

    con.commit()
    con.close()

    # Turso `--from-file` WAJIB WAL.
    subprocess.run(["sqlite3", a.out, "PRAGMA journal_mode=WAL"], check=True, capture_output=True)
    log(f"journal_mode=WAL ditetapkan")
    log(f"✓ siap: {a.out} ({os.path.getsize(a.out)/1e6:.0f} MB)")


if __name__ == "__main__":
    main()
