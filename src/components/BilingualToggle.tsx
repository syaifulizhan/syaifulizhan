"use client";
import { useState } from "react";
import type { Tr } from "@/lib/hadis";

/**
 * Toggle dwibahasa pada matn: العربية (tiada terjemahan) | + Melayu | + English.
 * Bantu pelajar crosscheck makna. Terjemahan AI ditanda "draf — belum disemak".
 */
export function BilingualToggle({ tr }: { tr?: Tr }) {
  const [lang, setLang] = useState<"ar" | "ms" | "en">("ar");
  return (
    <div className="btoggle">
      <div className="btoggle-row">
        <button className={`btoggle-btn${lang === "ar" ? " active" : ""}`} onClick={() => setLang("ar")}>
          العربية
        </button>
        <button className={`btoggle-btn${lang === "ms" ? " active" : ""}`} onClick={() => setLang("ms")}>
          + Melayu
        </button>
        <button className={`btoggle-btn${lang === "en" ? " active" : ""}`} onClick={() => setLang("en")}>
          + English
        </button>
      </div>

      {lang === "ms" &&
        (tr?.ms ? (
          <p className="btoggle-tr">
            {tr.ms}
            {!tr.ms_verified && <span className="btoggle-flag">draf — belum disemak</span>}
          </p>
        ) : (
          <p className="btoggle-empty">Terjemahan Melayu belum tersedia.</p>
        ))}

      {lang === "en" &&
        (tr?.en ? (
          <p className="btoggle-tr" style={{ direction: "ltr", fontStyle: "italic" }}>
            {tr.en}
            {!tr.en_verified && <span className="btoggle-flag">draft — unverified</span>}
          </p>
        ) : (
          <p className="btoggle-empty">English translation not available yet.</p>
        ))}
    </div>
  );
}
