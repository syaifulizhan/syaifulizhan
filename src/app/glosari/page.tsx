import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { getGlossary } from "@/lib/glossary";

export const dynamic = "force-dynamic";

export default async function Glosari() {
  const terms = await getGlossary();

  // kumpul ikut huruf Arab (susunan abjad)
  const groups = new Map<string, typeof terms>();
  for (const t of terms) {
    const h = t.huruf || "—";
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(t);
  }

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">Glosari Istilah Hadis</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>
          Kamus Istilah
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px", maxWidth: 620 }}>
          Istilah ulum al-hadith (mustalah &amp; jarh wa ta&apos;dil) — teks Arab, transliterasi, terjemahan &amp;
          definisi. Teks Arab definisi menyusul daripada sumber asal. {terms.length} istilah.
        </p>

        {[...groups.entries()].map(([huruf, items]) => (
          <section key={huruf} style={{ marginBottom: 8 }}>
            <div className="glos-letter ar">{huruf}</div>
            {items.map((t) => (
              <article className="glos-card" key={t.term_ar}>
                <div className="glos-head">
                  <span className="glos-ar ar">{t.term_ar}</span>
                  {t.translit && <span className="glos-tr">{t.translit}</span>}
                </div>
                {(t.term_ms || t.def_ms) && (
                  <p className="glos-line">
                    <span className="glos-lang">BM</span>
                    {t.term_ms && <b className="glos-term">{t.term_ms}</b>}
                    {t.def_ms && <span className="glos-def"> — {t.def_ms}</span>}
                  </p>
                )}
                {(t.term_en || t.def_en) && (
                  <p className="glos-line">
                    <span className="glos-lang">EN</span>
                    {t.term_en && <b className="glos-term">{t.term_en}</b>}
                    {t.def_en && <span className="glos-def"> — {t.def_en}</span>}
                  </p>
                )}
              </article>
            ))}
          </section>
        ))}

        {!terms.length && <p className="pempty">Glosari belum di-seed.</p>}
      </main>
      <Footer />
    </>
  );
}
