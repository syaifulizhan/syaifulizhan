import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { searchNarrators, narratorCount } from "@/lib/narrators";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PerawiIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [results, total, lang] = await Promise.all([searchNarrators(q, 60), narratorCount(), getServerLang()]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">{T.perawiExplorer[lang]}</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>
          {T.perawiH1[lang]}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
          {total.toLocaleString("en-US")} {T.narrInCorpus[lang]}
        </p>

        <form className="psearch" action="/perawi" method="get">
          <input name="q" defaultValue={q} placeholder={T.perawiPlaceholder[lang]} />
          <button className="btn solid" type="submit">
            {T.searchBtn[lang]}
          </button>
        </form>

        <div className="presults">
          {results.map((e) => (
            <Link key={e.id} href={`/perawi/${e.id}`} className="pn">
              <span className="dot" />
              <span className="pn-nm ar">{e.name_ar}</span>
              <span className="pn-meta">{e.rutbah ?? ""}</span>
            </Link>
          ))}
        </div>

        {q && results.length === 0 && (
          <p className="pempty">{T.narrNone[lang]} “{q}”.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
