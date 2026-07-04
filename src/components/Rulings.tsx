import type { Ruling } from "@/lib/hadis";
import type { Lang } from "@/lib/types";

const HEAD: Record<Lang, string> = { bm: "Takhrij & Hukum", en: "Takhrij & Rulings", ar: "التخريج والأحكام" };
const PRIMARY_NOTE: Record<Lang, string> = {
  bm: "hukum dalam kitab ini",
  en: "ruling in this book",
  ar: "الحكم في هذا الكتاب",
};

// Papar SEMUA hukm muhaddith (dorar) dgn atribusi penuh — pelihara kepelbagaian
// sanad: matn sama, jalur berbeza boleh dapat hukm berbeza. Yang primer (kitab
// sumber = kitab hadis ini) diserlah sebagai hukum muktamad hadis tersebut.
export function Rulings({ rulings, lang }: { rulings: Ruling[]; lang: Lang }) {
  if (!rulings?.length) return null;
  return (
    <section className="rul">
      <div className="rul-head">۞ {HEAD[lang]}</div>
      <ul className="rul-list">
        {rulings.map((r, i) => (
          <li key={i} className={r.is_primary ? "rul-item rul-primary" : "rul-item"}>
            {r.is_primary ? <span className="rul-star">★</span> : <span className="rul-dot">·</span>}
            <div className="rul-body">
              <div className="rul-line ar">
                {r.muhaddith && <span className="rul-mhd">{r.muhaddith}</span>}
                {r.source_book && <span className="rul-src"> — {r.source_book}{r.ref ? ` (${r.ref})` : ""}</span>}
              </div>
              {r.hukm && <div className="rul-hukm ar">{r.hukm}</div>}
              <div className="rul-meta">
                {r.rawi && <span className="rul-rawi ar">{r.rawi}</span>}
                {r.is_primary ? <span className="rul-badge">{PRIMARY_NOTE[lang]}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
