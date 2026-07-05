"use client";
import { useState } from "react";
import type { Lang } from "@/lib/types";

const LABEL: Record<Lang, string> = { bm: "Syarah", en: "Commentary", ar: "الشرح" };
const OPEN: Record<Lang, string> = { bm: "Buka", en: "Open", ar: "افتح" };
const CLOSE: Record<Lang, string> = { bm: "Tutup", en: "Close", ar: "طيّ" };
const LOADING: Record<Lang, string> = { bm: "Memuat…", en: "Loading…", ar: "…" };
const NONE: Record<Lang, string> = { bm: "Tiada syarah", en: "No commentary", ar: "لا شرح" };
const SRC = "فتح الباري — ابن حجر";

// Nota-kaki syarah (Fath al-Bari) DI BAWAH satu hadis — ikut باب hadis itu (padanan matan).
// Papar tajuk باب + huraian ابن حجر. Lazy: muat bila buka (elak teks besar dlm SSR).
export function HadithSyarah({ bookRef, kitabNo, babTitle, lang }: {
  bookRef: number; kitabNo: number; babTitle: string; lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!open && text === null) {
      setBusy(true);
      try {
        const r = await fetch(`/api/hadith-syarah?book=${bookRef}&kitab=${kitabNo}&bab=${encodeURIComponent(babTitle)}`);
        setText((await r.json()).text ?? "");
      } catch { setText(""); }
      setBusy(false);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="hsy">
      <button className="hsy-head" onClick={toggle} aria-expanded={open}>
        <span className="hsy-mark">۞</span>
        <span className="hsy-label">{LABEL[lang]}</span>
        <span className="hsy-bab ar">{babTitle.replace(/^[\d٠-٩]+\s*-\s*/, "")}</span>
        <span className="hsy-cnt">{busy ? LOADING[lang] : open ? CLOSE[lang] : OPEN[lang]}</span>
      </button>
      {open && text !== null && (
        text ? (
          <div className="hsy-body">
            <div className="hsy-text ar">{text}</div>
            <div className="hsy-src">— {SRC}</div>
          </div>
        ) : <div className="hsy-empty">{NONE[lang]}</div>
      )}
    </div>
  );
}
