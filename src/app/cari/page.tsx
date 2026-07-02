import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { SearchBox } from "@/components/SearchBox";
import { searchHadith, searchBooks } from "@/lib/hadis";
import { searchNarrators } from "@/lib/narrators";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Cari({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "hadis" } = await searchParams;
  const t = ["hadis", "perawi", "kitab"].includes(type) ? type : "hadis";

  const [hadis, perawi, kitab, lang] = await Promise.all([
    q && t === "hadis" ? searchHadith(q, 40) : Promise.resolve([]),
    q && t === "perawi" ? searchNarrators(q, 60) : Promise.resolve([]),
    q && t === "kitab" ? searchBooks(q, 40) : Promise.resolve([]),
    getServerLang(),
  ]);
  const count = t === "hadis" ? hadis.length : t === "perawi" ? perawi.length : kitab.length;
  const label = t === "hadis" ? T.navHadis[lang] : t === "perawi" ? T.navPerawi[lang] : T.searchKitab[lang];

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">{T.searchTitle[lang]}</div>
        <SearchBox big defaultType={t} defaultQ={q} />

        {q && (
          <div className="psec-t" style={{ marginTop: 8 }}>
            {T.searchResults[lang]}: {count} · {label} · “{q}”
          </div>
        )}

        {t === "hadis" &&
          hadis.map((r) => (
            <Link href={`/kitab/${r.book_id}?h=${r.id}#h-${r.id}`} key={r.id} className="hcard" style={{ display: "block" }}>
              {r.book && <div className="hchap ar">{r.book}{r.chapter_ar ? ` — ${r.chapter_ar}` : ""}</div>}
              <div className="hmatn ar" style={{ fontSize: "1.25rem", marginBottom: 0 }}>{r.matn_ar}</div>
            </Link>
          ))}

        {t === "perawi" && (
          <div className="presults">
            {perawi.map((e) => (
              <Link key={e.id} href={`/perawi/${e.id}`} className="pn">
                <span className="dot" />
                <span className="pn-nm ar">{e.name_ar}</span>
                <span className="pn-meta">{e.rutbah ?? ""}</span>
              </Link>
            ))}
          </div>
        )}

        {t === "kitab" && (
          <div className="hbooks">
            {kitab.map((b) => (
              <Link href={`/kitab/${b.id}`} key={b.id} className="hbook">
                <span className="t ar">{b.title_ar}</span>
                <span className="n">{b.n} {T.hadisCount[lang]}</span>
              </Link>
            ))}
          </div>
        )}

        {q && count === 0 && <p className="pempty">{T.searchNone[lang]} “{q}”</p>}
        {!q && <p className="pempty">{T.searchPrompt[lang]}</p>}
      </main>
      <Footer />
    </>
  );
}
