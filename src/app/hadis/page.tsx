import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { listBooks, searchHadith, hadithCount } from "@/lib/hadis";

export const dynamic = "force-dynamic";

export default async function HadisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [books, results, total] = await Promise.all([
    listBooks(60),
    q ? searchHadith(q, 30) : Promise.resolve([]),
    hadithCount(),
  ]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">Penjelajah Hadis</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>Hadis</h1>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
          {total.toLocaleString("ms-MY")} hadis dalam korpus setakat ini.
        </p>

        <form className="psearch" action="/hadis" method="get">
          <input name="q" defaultValue={q} placeholder="Cari teks hadis… (cth: نية)" />
          <button className="btn solid" type="submit">
            Cari
          </button>
        </form>

        {q ? (
          <>
            <div className="psec-t">Hasil carian “{q}” ({results.length})</div>
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
            {!results.length && <p className="pempty">Tiada hadis padan.</p>}
          </>
        ) : (
          <>
            <div className="psec-t">Kitab</div>
            <div className="hbooks">
              {books.map((b) => (
                <Link href={`/kitab/${b.id}`} key={b.id} className="hbook">
                  <span className="t ar">{b.title_ar}</span>
                  <span className="n">{b.n} hadis</span>
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
