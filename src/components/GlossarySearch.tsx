"use client";
import { useMemo, useState } from "react";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import type { GlossaryTerm } from "@/lib/glossary";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "");

export function GlossarySearch({ terms, lang }: { terms: GlossaryTerm[]; lang: Lang }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return terms;
    return terms.filter((t) =>
      [t.term_ar, t.translit, t.term_ms, t.term_en, t.def_ms, t.def_en].some(
        (v) => v && norm(v).includes(k)
      )
    );
  }, [q, terms]);

  // kumpul ikut huruf Arab
  const groups = new Map<string, GlossaryTerm[]>();
  for (const t of filtered) {
    const h = t.huruf || "—";
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(t);
  }

  return (
    <>
      <div className="psearch" style={{ marginBottom: 22 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={T.glosariSearch[lang]}
          aria-label={T.glosariSearch[lang]}
          autoFocus
        />
      </div>

      {[...groups.entries()].map(([huruf, items]) => (
        <section key={huruf} style={{ marginBottom: 8 }}>
          <div className="glos-letter ar">{huruf}</div>
          {items.map((t) => (
            <article className="glos-card" key={t.term_ar}>
              <div className="glos-head">
                <span className="glos-ar ar">{t.term_ar}</span>
                {t.translit && <span className="glos-tr">{t.translit}</span>}
              </div>
              {t.def_ar && (
                <p className="glos-line">
                  <span className="glos-lang">ع</span>
                  <span className="glos-def ar" style={{ direction: "rtl", color: "var(--paper)" }}>{t.def_ar}</span>
                </p>
              )}
              {(t.term_ms || t.def_ms) && (
                <p className="glos-line">
                  <span className="glos-lang">BM</span>
                  {t.term_ms && <b className="glos-term">{t.term_ms}</b>}
                  {t.def_ms && <span className="glos-def"> — {t.def_ms}</span>}
                </p>
              )}
              {(t.term_en || t.def_en) && (
                <p className="glos-line">
                  <span className="glos-lang">EN</span>
                  {t.term_en && <b className="glos-term">{t.term_en}</b>}
                  {t.def_en && <span className="glos-def"> — {t.def_en}</span>}
                </p>
              )}
            </article>
          ))}
        </section>
      ))}

      {!filtered.length && <p className="pempty">{T.glosariNoMatch[lang]}</p>}
    </>
  );
}
