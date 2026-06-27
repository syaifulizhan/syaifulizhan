"use client";

import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link className="brand" href="/" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/logo-mark.png" alt="" aria-hidden="true" />
          <span>
            <span
              className={`brand-main${lang === "ar" ? " ar" : ""}`}
              dangerouslySetInnerHTML={{ __html: T.brandMain[lang] }}
            />
            <span className="brand-sub"> {T.brandSub[lang]}</span>
          </span>
        </Link>

        <div className="nav-right">
          <nav className={`nav-menu${open ? " open" : ""}`}>
            <ul>
              <li><Link href="/perawi" onClick={close}>{T.navPerawi[lang]}</Link></li>
              <li><Link href="/hadis" onClick={close}>{T.navHadis[lang]}</Link></li>
              <li><Link href="/glosari" onClick={close}>{T.navGlosari[lang]}</Link></li>
              <li><a href="/#ilmu" onClick={close}>{T.navIlmu[lang]}</a></li>
              <li><a href="/#tentang" onClick={close}>{T.navTentang[lang]}</a></li>
              <li><a href="/#khidmat" onClick={close}>{T.navKhidmat[lang]}</a></li>
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

          <button
            type="button"
            className={`nav-burger${open ? " open" : ""}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {open && <div className="nav-overlay" onClick={close} aria-hidden="true" />}
    </header>
  );
}
