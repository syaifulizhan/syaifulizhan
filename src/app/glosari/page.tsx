import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { getGlossary } from "@/lib/glossary";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";
import { GlossarySearch } from "@/components/GlossarySearch";

export const dynamic = "force-dynamic";

export default async function Glosari() {
  const [terms, lang] = await Promise.all([getGlossary(), getServerLang()]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">{T.glosariTitle[lang]}</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>
          {T.glosariH1[lang]}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px", maxWidth: 620 }}>
          {T.glosariDesc[lang]} {terms.length} {T.istilahWord[lang]}.
        </p>

        {terms.length ? (
          <GlossarySearch terms={terms} lang={lang} />
        ) : (
          <p className="pempty">{T.glosariEmpty[lang]}</p>
        )}
      </main>
      <Footer />
    </>
  );
}
