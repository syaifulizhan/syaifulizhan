"use client";

import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { T } from "@/lib/i18n";

const CARDS = [
  { num: "I.", ar: "عِلْمُ الحَدِيث", h3: "card1H3", p: "card1P" },
  { num: "II.", ar: "عِلْمُ الرِّوَايَة", h3: "card2H3", p: "card2P" },
  { num: "III.", ar: "المَقَالَات", h3: "card3H3", p: "card3P" },
] as const;

export default function Ilmu() {
  const { lang } = useLang();

  return (
    <section className="ilmu" id="ilmu">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="eyebrow">{T.ilmuEyebrow[lang]}</span>
          <h2>{T.ilmuH2[lang]}</h2>
          <p>{T.ilmuP[lang]}</p>
        </Reveal>
        <div className="cards">
          {CARDS.map((c) => (
            <Reveal key={c.num} className="card">
              <div className="card-num">{c.num}</div>
              <div className="card-ar">{c.ar}</div>
              <h3>{T[c.h3][lang]}</h3>
              <p>{T[c.p][lang]}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
