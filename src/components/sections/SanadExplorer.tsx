"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { T } from "@/lib/i18n";
import { HADITH } from "@/lib/hadith";

export default function SanadExplorer() {
  const { lang } = useLang();
  const [active, setActive] = useState(0);
  const [prevActive, setPrevActive] = useState(0);
  const [chainIn, setChainIn] = useState(false);

  // Reset semasa render bila hadith bertukar (corak React rasmi).
  if (prevActive !== active) {
    setPrevActive(active);
    setChainIn(false);
  }

  // Stagger semula nodes selepas commit.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setChainIn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [active]);

  const d = HADITH[active];

  return (
    <section className="sanad" id="sanad">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="eyebrow">{T.sanadEyebrow[lang]}</span>
          <h2>{T.sanadH2[lang]}</h2>
          <p>{T.sanadP[lang]}</p>
        </Reveal>

        <Reveal className="sanad-grid">
          <div>
            <div className="chips">
              {HADITH.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  className={`chip${i === active ? " active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  {h.label[lang]}
                </button>
              ))}
            </div>

            <div className="matn">
              <div className="matn-ar">{d.ar}</div>
              <div className="matn-tr">{d.tr[lang]}</div>
            </div>

            <div className="verdict">
              <span className="badge">
                <span className="dot" />
                <span>{d.grade[lang]}</span>
              </span>
              <span className="takhrij">
                {T.takhrijLabel[lang]}&nbsp;
                <span
                  style={{
                    color: "var(--paper)",
                    fontFamily: "var(--sans)",
                    fontSize: ".85rem",
                  }}
                >
                  {d.takhrij}
                </span>
              </span>
            </div>

            <p className="sanad-note">{T.sanadNote[lang]}</p>
          </div>

          <div className="chain-panel">
            <div className="chain-ph">{T.chainTitle[lang]}</div>
            <div className={`chain${chainIn ? " in" : ""}`}>
              {d.chain.map((n, idx) => (
                <div
                  key={idx}
                  className={`node${n.type ? " " + n.type : ""}`}
                  style={{ transitionDelay: `${idx * 65}ms` }}
                >
                  <span className="marker" />
                  <div className="nm">{n.nm}</div>
                  <div className="role">{n.role}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
