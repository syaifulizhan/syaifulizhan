"use client";
import { useState } from "react";
import type { Chapter, BabItem } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const SEARCH_PH: Record<Lang, string> = { bm: "Cari matan dalam kitab ini…", en: "Search matn in this book…", ar: "ابحث في متن هذا الكتاب…" };
const TOC: Record<Lang, string> = { bm: "Isi Kandungan", en: "Table of Content", ar: "فهرس الكتاب" };
const KITAB: Record<Lang, string> = { bm: "kitab", en: "books", ar: "كتابًا" };
const CLEAR: Record<Lang, string> = { bm: "Kosongkan", en: "Clear", ar: "مسح" };

// Satu كتاب dlm ToC: nama (link lompat) + toggle باب (kembang → muat باب dari struktur penulis).
function KitabRow({ c, basePath, bookRef, hasBab }: { c: Chapter; basePath: string; bookRef: number; hasBab: boolean }) {
  const [open, setOpen] = useState(false);
  const [bab, setBab] = useState<BabItem[] | null>(null);
  async function toggle() {
    if (!open && bab === null) {
      try { const r = await fetch(`/api/bab?book=${bookRef}&kitab=${c.chapter_ref}`); setBab((await r.json()).bab ?? []); }
      catch { setBab([]); }
    }
    setOpen((v) => !v);
  }
  return (
    <li>
      <div className="bnav-krow">
        {hasBab ? (
          <button className="bnav-kexp" onClick={toggle} aria-expanded={open} aria-label="باب">{open ? "▾" : "▸"}</button>
        ) : <span className="bnav-kexp bnav-kexp-x" />}
        <a className="bnav-klink" href={`${basePath}?ch=${c.chapter_ref}`}>
          <span className="bnav-ktb ar">{c.chapter_ar}</span>
          <span className="bnav-n">{c.n}</span>
        </a>
      </div>
      {open && bab && bab.length > 0 && (
        <ol className="bnav-bab">
          {bab.map((b) => (
            <li key={b.bab_no}>
              <a className="ar" href={`${basePath}?ch=${c.chapter_ref}`}>{b.bab_title}</a>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

// Navigasi kitab: kotak carian per-kitab (matn) + Table of Content burger dua-peringkat
// (كتاب → باب ikut struktur penulis, kaedah paling tepat). ToC klik → lompat ke كتاب.
export function BookNav({ chapters, basePath, currentSearch, lang, bookRef, hasBab }: {
  chapters: Chapter[]; basePath: string; currentSearch: string; lang: Lang; bookRef: number; hasBab: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bnav">
      <form className="bnav-search" method="get" action={basePath}>
        <input name="s" defaultValue={currentSearch} placeholder={SEARCH_PH[lang]} dir="rtl" className="ar" />
        <button className="btn solid" type="submit" aria-label="cari">⌕</button>
        {currentSearch && <a className="bnav-clear" href={basePath}>{CLEAR[lang]}</a>}
      </form>
      {chapters.length > 0 && (
        <div className="bnav-toc">
          <button className="bnav-burger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span className="bnav-lines">☰</span> {TOC[lang]} <span className="bnav-cnt">{chapters.length} {KITAB[lang]}</span>
          </button>
          {open && (
            <ol className="bnav-list">
              {chapters.map((c) => (
                <KitabRow key={c.chapter_ref} c={c} basePath={basePath} bookRef={bookRef} hasBab={hasBab} />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
