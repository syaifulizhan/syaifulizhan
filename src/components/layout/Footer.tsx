"use client";

import { useLang } from "@/components/LangProvider";
import { T } from "@/lib/i18n";

const HANDLES = [
  "X · @syaifulizhan",
  "YouTube · @syaifulizhann",
  "TikTok · @syaifulizhan",
  "Telegram · @syaifulizhan",
  "Threads · @syaifulizhan",
];

// "Kawan baik" — rujukan terjemahan istilah untuk pengguna crosscheck.
const REFS = [
  { label: "Dewan Bahasa & Pustaka", url: "https://prpm.dbp.gov.my" },
  { label: "Kamus Arab–Melayu", url: "https://www.almaany.com/ms/dict/ar-ms/" },
  { label: "Kamus Melayu–Inggeris", url: "https://prpm.dbp.gov.my" },
];

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          <div className="foot-brand">
            <b
              className={lang === "ar" ? "ar" : ""}
              dangerouslySetInnerHTML={{ __html: `۞ ${T.brandMain[lang]}` }}
            />
            {lang !== "ar" && <div className="foot-ar">دِيوَان الإِذهَان</div>}
            <p>{T.footP[lang]}</p>
          </div>
          <div className="handles">
            {HANDLES.map((h) => (
              <a key={h} href="#">
                {h}
              </a>
            ))}
          </div>
          <div className="handles">
            <span className="foot-reflabel">{T.footRujukan[lang]}</span>
            {REFS.map((r) => (
              <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer">
                {r.label}
              </a>
            ))}
          </div>
        </div>
        <div className="copyr">
          © 2026 Muhammad Syaiful Izhan · syaifulizhan.my
        </div>
      </div>
    </footer>
  );
}
