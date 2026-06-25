import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { Isnad } from "@/components/Isnad";
import { GradeBadge } from "@/components/GradeBadge";
import { BilingualToggle } from "@/components/BilingualToggle";
import { SuggestForm } from "@/components/SuggestForm";
import { Pagination } from "@/components/Pagination";
import { getBook, getBookHadiths, getBookHadithCount, getIsnadFor, getTranslationsFor } from "@/lib/hadis";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const PER_PAGE = 20;

export default async function KitabPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const bid = Number(id);
  if (!Number.isInteger(bid)) notFound();
  const book = await getBook(bid);
  if (!book) notFound();

  const total = await getBookHadithCount(bid);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, Number(pageStr) || 1), totalPages);

  const hadiths = await getBookHadiths(bid, PER_PAGE, (page - 1) * PER_PAGE);
  const ids = hadiths.map((h) => h.id);
  const [isnads, trs] = await Promise.all([getIsnadFor(ids), getTranslationsFor(ids)]);
  const lang = await getServerLang();

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <Link href="/hadis">{T.navHadis[lang]}</Link>
          <span>›</span>
          <span className="ar">{book.title_ar}</span>
        </div>
        <header className="phead">
          <div className="pname ar">{book.title_ar}</div>
          <div className="pbadges">
            <span className="pbadge">{total.toLocaleString("en-US")} {T.hadisCount[lang]}</span>
            <span className="pbadge">{T.pageLabel[lang]} {page} / {totalPages}</span>
          </div>
        </header>

        <div style={{ marginTop: "24px" }}>
          {hadiths.map((h) => (
            <article className="hcard" key={h.id}>
              <div className="hcard-top">
                {h.chapter_ar && <div className="hchap ar">{h.chapter_ar}</div>}
                <GradeBadge grade={h.grade} />
              </div>
              <div className="hmatn ar">{h.matn_ar}</div>
              <BilingualToggle tr={trs.get(h.id)} />
              <Isnad nodes={isnads.get(h.id) ?? []} lang={lang} />
              <SuggestForm entityType="hadith" entityId={h.id} field="matn" currentText={h.matn_ar} />
            </article>
          ))}
          {!hadiths.length && (
            <p className="pempty">{T.kitabEmpty[lang]}</p>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} basePath={`/kitab/${bid}`} />
      </main>
      <Footer />
    </>
  );
}
