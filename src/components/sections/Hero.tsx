"use client";

import { useLang } from "@/components/LangProvider";
import Reveal from "@/components/ui/Reveal";
import { T } from "@/lib/i18n";

export default function Hero() {
  const { lang } = useLang();

  return (
    <section className="hero" id="beranda">
      <div className="bg-pattern" aria-hidden="true" />
      <div className="wrap">
        <Reveal className="unwan">
          <span className="awn-corner tl">۞</span>
          <span className="awn-corner tr">۞</span>
          <span className="awn-corner bl">۞</span>
          <span className="awn-corner br">۞</span>
          <div className="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <div className="hero-ar-name">
            <span className="hero-ar-diwan">دِيوَان الإِذهَان</span>
            <span className="hero-ar-person">مُحَمَّد سَيْف الإِذهَان</span>
          </div>
          <h1 dangerouslySetInnerHTML={{ __html: T.heroH1[lang] }} />
          <div className="hero-sub">{T.heroSub[lang]}</div>
          <p
            className="hero-thesis"
            dangerouslySetInnerHTML={{ __html: T.heroThesis[lang] }}
          />
          <div className="cta-row">
            <a className="btn solid" href="#silsilah">
              {T.heroCta1[lang]}
            </a>
            <a className="btn ghost" href="#ilmu">
              {T.heroCta2[lang]}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
