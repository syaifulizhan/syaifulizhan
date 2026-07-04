"use client";
import { useState } from "react";
import type { Chapter } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const SEARCH_PH: Record<Lang, string> = { bm: "Cari matan dalam kitab ini…", en: "Search matn in this book…", ar: "ابحث في متن هذا الكتاب…" };
const TOC: Record<Lang, string> = { bm: "Isi Kandungan", en: "Table of Content", ar: "فهرس الكتاب" };
const KITAB: Record<Lang, string> = { bm: "kitab", en: "books", ar: "كتابًا" };
const CLEAR: Record<Lang, string> = { bm: "Kosongkan", en: "Clear", ar: "مسح" };

// Navigasi kitab: kotak carian per-kitab (matn) + Table of Content burger
// (struktur كتاب asal — kaedah paling tepat). ToC klik → lompat ke halaman كتاب itu.
export function BookNav({ chapters, basePath, currentSearch, lang }: {
  chapters: Chapter[]; basePath: string; currentSearch: string; lang: Lang;
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
                <li key={c.chapter_ref}>
                  <a href={`${basePath}?ch=${c.chapter_ref}`}>
                    <span className="bnav-ktb ar">{c.chapter_ar}</span>
                    <span className="bnav-n">{c.n}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
