"use client";

import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { T } from "@/lib/i18n";
import { FOR_SEGS } from "@/lib/hadith";

export default function Khidmat() {
  const { lang } = useLang();

  return (
    <section className="khidmat" id="khidmat">
      <svg className="bg-pattern" aria-hidden="true">
        <rect width="100%" height="100%" fill="url(#khatam)" />
      </svg>
      <Reveal className="wrap kh-in">
        <span className="kh-tab">{T.khTab[lang]}</span>
        <h2 dangerouslySetInnerHTML={{ __html: T.khH2[lang] }} />
        <p className="kh-lead">{T.khLead[lang]}</p>
        <div className="for-row">
          {FOR_SEGS[lang].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <a className="btn solid" href="#khidmat">
          {T.khCta[lang]}
        </a>
        <p className="proof" dangerouslySetInnerHTML={{ __html: T.khProof[lang] }} />
      </Reveal>
    </section>
  );
}
