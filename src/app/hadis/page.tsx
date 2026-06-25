import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { listBooks, searchHadith, hadithCount } from "@/lib/hadis";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HadisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [books, results, total, lang] = await Promise.all([
    listBooks(60),
    q ? searchHadith(q, 30) : Promise.resolve([]),
    hadithCount(),
    getServerLang(),
  ]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">{T.hadisExplorer[lang]}</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>{T.navHadis[lang]}</h1>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
          {total.toLocaleString("en-US")} {T.inCorpus[lang]}
        </p>

        <form className="psearch" action="/hadis" method="get">
          <input name="q" defaultValue={q} placeholder={T.searchPlaceholder[lang]} />
          <button className="btn solid" type="submit">
            {T.searchBtn[lang]}
          </button>
        </form>

        {q ? (
          <>
            <div className="psec-t">{T.searchResults[lang]} “{q}” ({results.length})</div>
            {results.map((r) => (
              <Link href={`/kitab/${r.book_id}`} key={r.id} className="hcard" style={{ display: "block" }}>
                {r.book && (
                  <div className="hchap ar">
                    {r.book}
                    {r.chapter_ar ? ` — ${r.chapter_ar}` : ""}
                  </div>
                )}
                <div className="hmatn ar" style={{ fontSize: "1.25rem", marginBottom: 0 }}>
                  {r.matn_ar}
                </div>
              </Link>
            ))}
            {!results.length && <p className="pempty">{T.searchNone[lang]}</p>}
          </>
        ) : (
          <>
            <div className="psec-t">{T.searchKitab[lang]}</div>
            <div className="hbooks">
              {books.map((b) => (
                <Link href={`/kitab/${b.id}`} key={b.id} className="hbook">
                  <span className="t ar">{b.title_ar}</span>
                  <span className="n">{b.n} {T.hadisCount[lang]}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
