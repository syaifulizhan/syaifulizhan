"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ar", label: "ع" },
  { code: "bm", label: "BM" },
  { code: "en", label: "EN" },
];

export default function Nav() {
  const { lang, setLang } = useLang();

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link className="brand" href="/">
          <span className="brand-star">۞</span>
          <span>
            <span className="brand-main">
              Dewan <em>Izhan</em>
            </span>
            <span className="brand-sub"> {T.brandSub[lang]}</span>
          </span>
        </Link>
        <div className="nav-right">
          <nav>
            <ul>
              <li>
                <Link href="/perawi">{T.navPerawi[lang]}</Link>
              </li>
              <li>
                <Link href="/hadis">{T.navHadis[lang]}</Link>
              </li>
              <li>
                <Link href="/glosari">{T.navGlosari[lang]}</Link>
              </li>
              <li>
                <a href="/#ilmu">{T.navIlmu[lang]}</a>
              </li>
              <li>
                <a href="/#tentang">{T.navTentang[lang]}</a>
              </li>
              <li>
                <a href="/#khidmat">{T.navKhidmat[lang]}</a>
              </li>
            </ul>
          </nav>
          <div className="lang-sw" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`lang-btn${lang === l.code ? " active" : ""}`}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
