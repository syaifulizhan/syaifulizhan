"use client";
import { useState } from "react";
import type { SharahBook, SharahSeg } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const HEAD: Record<Lang, string> = { bm: "Syarah", en: "Commentary", ar: "الشرح" };
const OPEN: Record<Lang, string> = { bm: "Buka syarah كتاب ini", en: "Open commentary for this book", ar: "افتح شرح هذا الكتاب" };
const CLOSE: Record<Lang, string> = { bm: "Tutup", en: "Close", ar: "طيّ" };
const BAB: Record<Lang, string> = { bm: "bab", en: "chapters", ar: "بابًا" };
const LOADING: Record<Lang, string> = { bm: "Memuat…", en: "Loading…", ar: "جارٍ التحميل…" };

function Bab({ seg }: { seg: SharahSeg }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="shk-bab">
      <button className="shk-bab-h ar" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="shk-caret">{open ? "▾" : "▸"}</span>
        <span className="shk-babt">{seg.bab_no > 0 ? (seg.bab_title || `باب ${seg.bab_no}`) : seg.kitab_title}</span>
      </button>
      {open && <div className="shk-text ar">{seg.text}</div>}
    </li>
  );
}

// Syarah INLINE per كتاب (nota-kaki ابن حجر) — MUAT bila buka (lazy) supaya halaman
// kitab kekal ringan. Disusun باب demi باب (metodologi Fath al-Bari).
export function SharahKitab({ book, kitabNo, bookRef, nBab, lang }: {
  book: SharahBook; kitabNo: number; bookRef: number; nBab: number; lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [segs, setSegs] = useState<SharahSeg[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!open && segs === null) {
      setBusy(true);
      try {
        const r = await fetch(`/api/syarah?book=${bookRef}&kitab=${kitabNo}`);
        const d = await r.json();
        setSegs(d.segs ?? []);
      } catch { setSegs([]); }
      setBusy(false);
    }
    setOpen((v) => !v);
  }

  return (
    <section className="shk">
      <button className="shk-head" onClick={toggle} aria-expanded={open}>
        ۞ {HEAD[lang]}: {book.name}{book.author ? ` — ${book.author}` : ""}
        <span className="shk-cnt">{busy ? LOADING[lang] : open ? CLOSE[lang] : `${OPEN[lang]} · ${nBab} ${BAB[lang]}`}</span>
      </button>
      {open && segs && (
        <ol className="shk-list">
          {segs.map((s, i) => <Bab key={i} seg={s} />)}
        </ol>
      )}
    </section>
  );
}
