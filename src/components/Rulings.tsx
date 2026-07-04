"use client";
import { useState } from "react";
import type { Ruling } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const HEAD: Record<Lang, string> = { bm: "Takhrij & Hukum", en: "Takhrij & Rulings", ar: "التخريج والأحكام" };
const PRIMARY_NOTE: Record<Lang, string> = { bm: "hukum dalam kitab ini", en: "ruling in this book", ar: "الحكم في هذا الكتاب" };
const MORE: Record<Lang, (n: number) => string> = {
  bm: (n) => `Lihat ${n} hukum & takhrij lain`,
  en: (n) => `Show ${n} more rulings & takhrij`,
  ar: (n) => `عرض ${n} حكمًا وتخريجًا آخر`,
};
const LESS: Record<Lang, string> = { bm: "Tutup", en: "Collapse", ar: "طيّ" };

function Item({ r, lang }: { r: Ruling; lang: Lang }) {
  return (
    <li className={r.is_primary ? "rul-item rul-primary" : "rul-item"}>
      {r.is_primary ? <span className="rul-star">★</span> : <span className="rul-dot">·</span>}
      <div className="rul-body">
        <div className="rul-line ar">
          {r.muhaddith && <span className="rul-mhd">{r.muhaddith}</span>}
          {r.source_book && (
            r.href
              ? <a className="rul-src rul-link" href={r.href}> — {r.source_book}{r.ref ? ` (${r.ref})` : ""} ↵</a>
              : <span className="rul-src"> — {r.source_book}{r.ref ? ` (${r.ref})` : ""}</span>
          )}
        </div>
        {r.hukm && <div className="rul-hukm ar">{r.hukm}</div>}
        <div className="rul-meta">
          {r.rawi && <span className="rul-rawi ar">{r.rawi}</span>}
          {r.is_primary ? <span className="rul-badge">{PRIMARY_NOTE[lang]}</span> : null}
        </div>
      </div>
    </li>
  );
}

// Buka-tutup: hukum PRIMER (sumber = kitab ini) sentiasa nampak; takhrij/hukm lain
// dilipat supaya senang skrol. Pelihara kepelbagaian sanad — semua jalur dipapar
// bila dibuka (matn sama, sanad berbeza boleh dapat hukm berbeza).
export function Rulings({ rulings, lang }: { rulings: Ruling[]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  if (!rulings?.length) return null;
  // yang primer di atas (getRulingsFor sudah susun is_primary DESC), selebihnya dilipat
  const head = rulings.filter((r) => r.is_primary);
  const rest = rulings.filter((r) => !r.is_primary);
  const shown = head.length ? head : rulings.slice(0, 1);
  const hidden = head.length ? rest : rulings.slice(1);
  return (
    <section className="rul">
      <div className="rul-head">۞ {HEAD[lang]}</div>
      <ul className="rul-list">
        {shown.map((r, i) => <Item key={i} r={r} lang={lang} />)}
        {open && hidden.map((r, i) => <Item key={`h${i}`} r={r} lang={lang} />)}
      </ul>
      {hidden.length > 0 && (
        <button className="rul-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? `▴ ${LESS[lang]}` : `▾ ${MORE[lang](hidden.length)}`}
        </button>
      )}
    </section>
  );
}
