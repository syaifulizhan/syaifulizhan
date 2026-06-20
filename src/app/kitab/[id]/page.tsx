import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { Isnad } from "@/components/Isnad";
import { BilingualToggle } from "@/components/BilingualToggle";
import { getBook, getBookHadiths, getIsnadFor, getTranslationsFor } from "@/lib/hadis";

export const dynamic = "force-dynamic";

export default async function KitabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bid = Number(id);
  if (!Number.isInteger(bid)) notFound();
  const book = await getBook(bid);
  if (!book) notFound();

  const hadiths = await getBookHadiths(bid, 80);
  const ids = hadiths.map((h) => h.id);
  const [isnads, trs] = await Promise.all([getIsnadFor(ids), getTranslationsFor(ids)]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <Link href="/hadis">Hadis</Link>
          <span>›</span>
          <span className="ar">{book.title_ar}</span>
        </div>
        <header className="phead">
          <div className="pname ar">{book.title_ar}</div>
          <div className="pbadges">
            <span className="pbadge">{hadiths.length} hadis dipapar</span>
          </div>
        </header>

        <div style={{ marginTop: "24px" }}>
          {hadiths.map((h) => (
            <article className="hcard" key={h.id}>
              {h.chapter_ar && <div className="hchap ar">{h.chapter_ar}</div>}
              <div className="hmatn ar">{h.matn_ar}</div>
              <BilingualToggle tr={trs.get(h.id)} />
              <Isnad nodes={isnads.get(h.id) ?? []} />
            </article>
          ))}
          {!hadiths.length && (
            <p className="pempty">Belum ada hadis untuk kitab ini (scrape hadis belum sampai sini).</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
