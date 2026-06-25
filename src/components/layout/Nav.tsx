"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ar", label: "ع" },
  { code: "bm", label: "BM" },
  { code: "en", label: "EN" },
];

const LINKS: { href: string; label: keyof typeof T }[] = [
  { href: "#sanad", label: "navSanad" },
  { href: "#ilmu", label: "navIlmu" },
  { href: "#tentang", label: "navTentang" },
  { href: "#khidmat", label: "navKhidmat" },
];

export default function Nav() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  // Kunci skrol badan bila menu mobile terbuka
  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  // Tutup menu bila ditekan Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a className="brand" href="#beranda" onClick={() => setOpen(false)}>
          <span className="brand-star">۞</span>
          <span>
            <span className="brand-main">
              Dīwān <em>Izhan</em>
            </span>
            <span className="brand-sub"> {T.brandSub[lang]}</span>
          </span>
        </a>

        <div className="nav-right">
          <nav className={`nav-links${open ? " is-open" : ""}`}>
            <ul>
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)}>
                    {T[l.label][lang]}
                  </a>
                </li>
              ))}
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
            className={`nav-toggle${open ? " is-open" : ""}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  );
}
