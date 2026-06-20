"use client";

import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { T } from "@/lib/i18n";

const PILLARS = [
  { h4: "pillar1H4", p: "pillar1P" },
  { h4: "pillar2H4", p: "pillar2P" },
  { h4: "pillar3H4", p: "pillar3P" },
] as const;

export default function Tentang() {
  const { lang } = useLang();

  return (
    <section className="tentang" id="tentang">
      <div className="wrap">
        <div className="about-grid">
          <Reveal className="about-copy">
            <span className="eyebrow">{T.aboutEyebrow[lang]}</span>
            <h2 dangerouslySetInnerHTML={{ __html: T.aboutH2[lang] }} />
            <p dangerouslySetInnerHTML={{ __html: T.aboutP1[lang] }} />
            <p dangerouslySetInnerHTML={{ __html: T.aboutP2[lang] }} />
          </Reveal>
          <Reveal className="trinity">
            {PILLARS.map((p) => (
              <div className="pillar" key={p.h4}>
                <h4>{T[p.h4][lang]}</h4>
                <p>{T[p.p][lang]}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
