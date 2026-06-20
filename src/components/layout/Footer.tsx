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

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          <div className="foot-brand">
            <b>۞ Dewan Izhan</b>
            <div className="foot-ar">دِيوَان الإِذهَان</div>
            <p>{T.footP[lang]}</p>
          </div>
          <div className="handles">
            {HANDLES.map((h) => (
              <a key={h} href="#">
                {h}
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
