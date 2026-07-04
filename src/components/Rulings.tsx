"use client";
import { useState } from "react";
import type { Ruling } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const HEAD: Record<Lang, string> = { bm: "Takhrij & Hukum", en: "Takhrij & Rulings", ar: "التخريج والأحكام" };
const PRIMARY_NOTE: Record<Lang, string> = { bm: "kitab ini", en: "this book", ar: "هذا الكتاب" };
const MORE: Record<Lang, (n: number) => string> = {
  bm: (n) => `Lihat ${n} hukum & takhrij lain`,
  en: (n) => `Show ${n} more`,
  ar: (n) => `عرض ${n} أخرى`,
};
const LESS: Record<Lang, string> = { bm: "Tutup", en: "Collapse", ar: "طيّ" };

function Item({ r, lang }: { r: Ruling; lang: Lang }) {
  return (
    <li className={r.is_primary ? "rul-item rul-primary" : "rul-item"}>
      <div className="rul-main">
        {r.hukm && <span className="rul-verdict ar">{r.hukm}</span>}
        <span className="rul-attr ar">
          {r.is_primary && <span className="rul-star">★</span>}
          {r.muhaddith && <b className="rul-mhd">{r.muhaddith}</b>}
          {r.source_book && (
            r.href
              ? <a className="rul-link" href={r.href}>{r.source_book}{r.ref ? ` ${r.ref}` : ""}<span className="rul-go"> ↗</span></a>
              : <span className="rul-src">{r.source_book}{r.ref ? ` ${r.ref}` : ""}</span>
          )}
        </span>
      </div>
      {(r.rawi || r.is_primary) && (
        <div className="rul-sub ar">
          {r.rawi && <span className="rul-rawi">{r.rawi}</span>}
          {r.is_primary && <span className="rul-badge">{PRIMARY_NOTE[lang]}</span>}
        </div>
      )}
    </li>
  );
}

// Buka-tutup: hukum PRIMER (sumber = kitab ini) sentiasa nampak; takhrij lain dilipat.
// Pelihara kepelbagaian sanad — matn sama, sanad berbeza boleh dapat hukm berbeza.
export function Rulings({ rulings, lang }: { rulings: Ruling[]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  if (!rulings?.length) return null;
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
