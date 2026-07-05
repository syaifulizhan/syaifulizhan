"use client";
import { useState } from "react";
import type { SharahBook, SharahSeg } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const HEAD: Record<Lang, string> = { bm: "Syarah", en: "Commentary", ar: "الشرح" };
const OPEN: Record<Lang, string> = { bm: "Buka syarah كتاب ini", en: "Open commentary for this book", ar: "افتح شرح هذا الكتاب" };
const CLOSE: Record<Lang, string> = { bm: "Tutup", en: "Close", ar: "طيّ" };
const BAB: Record<Lang, string> = { bm: "bab", en: "chapters", ar: "بابًا" };

function Bab({ seg }: { seg: SharahSeg }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="shk-bab">
      <button className="shk-bab-h ar" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="shk-caret">{open ? "▾" : "▸"}</span>
        {seg.bab_no > 0 ? <span className="shk-babt">{seg.bab_title || `باب ${seg.bab_no}`}</span> : <span className="shk-babt">{seg.kitab_title}</span>}
      </button>
      {open && <div className="shk-text ar">{seg.text}</div>}
    </li>
  );
}

// Syarah INLINE per كتاب (nota-kaki ابن حجر) — melekat pada كتاب hadis yang dipapar,
// disusun باب demi باب (metodologi Fath al-Bari). Buka-tutup supaya tak membengkak.
export function SharahKitab({ book, segs, lang }: { book: SharahBook; segs: SharahSeg[]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  if (!segs?.length) return null;
  const nBab = segs.filter((s) => s.bab_no > 0).length;
  return (
    <section className="shk">
      <button className="shk-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        ۞ {HEAD[lang]}: {book.name}{book.author ? ` — ${book.author}` : ""}
        <span className="shk-cnt">{open ? CLOSE[lang] : `${OPEN[lang]} · ${nBab} ${BAB[lang]}`}</span>
      </button>
      {open && (
        <ol className="shk-list">
          {segs.map((s, i) => <Bab key={i} seg={s} />)}
        </ol>
      )}
    </section>
  );
}
