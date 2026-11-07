import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { Isnad } from "@/components/Isnad";
import { isMarfu } from "@/lib/parse-isnad";
import { GradeBadge } from "@/components/GradeBadge";
import { BilingualToggle } from "@/components/BilingualToggle";
import { SuggestForm } from "@/components/SuggestForm";
import { Pagination } from "@/components/Pagination";
import { Rulings } from "@/components/Rulings";
import { BookNav } from "@/components/BookNav";
import { SharahKitab } from "@/components/SharahKitab";
import { HadithSyarah } from "@/components/HadithSyarah";
import { getBook, getBookHadiths, getBookHadithCount, getBookChapters, getIsnadFor, getTranslationsFor, getRulingsFor, getSanadOverridesFor, getSharahMeta, getHadithBabFor } from "@/lib/hadis";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const PER_PAGE = 20;

/**
 * Carian dalam kitab (SSR Next). Halaman kitab biasa (/kitab/<id>/, /kitab/<id>/<n>/) dihidang sebagai aset statik
 * (scripts/gen-kitab-static.mjs) atau Worker (src/static/kitab-route.ts), BUKAN komponen ini.
 */
export async function KitabView({ bid, requestedPage, search }: { bid: number; requestedPage: number; search: string }) {
  const book = await getBook(bid);
  if (!book) notFound();

  const total = await getBookHadithCount(bid, search);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  const [hadiths, chapters] = await Promise.all([
    getBookHadiths(bid, PER_PAGE, (page - 1) * PER_PAGE, search),
    search ? Promise.resolve([]) : getBookChapters(bid),
  ]);
  const ids = hadiths.map((h) => h.id);
  // Syarah inline utk كتاب hadis yg dipapar (chapter_ref hadis pertama = kitab_no syarah).
  const kitabNo = hadiths.find((h) => h.chapter_ref != null)?.chapter_ref ?? 0;
  const [isnads, trs, rulings, overrides, sharah, babMap] = await Promise.all([
    getIsnadFor(ids), getTranslationsFor(ids), getRulingsFor(ids), getSanadOverridesFor(ids),
    kitabNo && !search ? getSharahMeta(bid, kitabNo) : Promise.resolve(null),
    getHadithBabFor(ids),
  ]);
  const lang = await getServerLang();
  const pageHref = search
    ? (p: number) => `/x/kitab/${bid}/?s=${encodeURIComponent(search)}&page=${p}`
    : (p: number) => `/kitab/${bid}/${p > 1 ? `${p}/` : ""}`;

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <a href="/hadis/">{T.navHadis[lang]}</a>
          <span>›</span>
          <span className="ar">{book.title_ar}</span>
        </div>
        <header className="phead">
          <div className="pname ar">{book.title_ar}</div>
          <div className="pbadges">
            <span className="pbadge">{total.toLocaleString("en-US")} {search ? T.hadisCount[lang] + " ✓" : T.hadisCount[lang]}</span>
            <span className="pbadge">{T.pageLabel[lang]} {page} / {totalPages}</span>
          </div>
        </header>

        <BookNav chapters={chapters} basePath={`/kitab/${bid}`} currentSearch={search} lang={lang} bookRef={bid} hasBab={!!sharah} />

        {sharah && <SharahKitab book={sharah.book} kitabNo={kitabNo} bookRef={bid} nBab={sharah.nBab} lang={lang} />}

        <div style={{ marginTop: "24px" }}>
          {hadiths.map((h) => (
            <article className="hcard" key={h.id} id={`h-${h.id}`}>
              <div className="hcard-top">
                {h.chapter_ar && <div className="hchap ar">{h.chapter_ar}</div>}
                <div className="hcard-meta">
                  <GradeBadge grade={h.grade} lang={lang} />
                  {h.number != null && (
                    <a className="hraqm" href={search ? `/x/h/${h.id}/#h-${h.id}` : `#h-${h.id}`}
                       title={search ? "Buka dlm kitab" : `${T.raqmLabel[lang]} ${h.number}`}>
                      {T.raqmLabel[lang]}&nbsp;{h.number.toLocaleString("en-US")}{search ? " ↗" : ""}
                    </a>
                  )}
                </div>
              </div>
              <div className="hmatn ar">{h.matn_ar}</div>
              <BilingualToggle tr={trs.get(h.id)} />
              <Isnad nodes={overrides.get(h.id) ?? isnads.get(h.id) ?? []} lang={lang} marfu={isMarfu(h.matn_ar)} />
              <Rulings rulings={rulings.get(h.id) ?? []} lang={lang} />
              {(() => { const b = babMap.get(h.id); return b?.bab_title && b.kitab_title
                ? <HadithSyarah bookRef={bid} kitabTitle={b.kitab_title} babTitle={b.bab_title} lang={lang} /> : null; })()}
              <SuggestForm entityType="hadith" entityId={h.id} field="matn" currentText={h.matn_ar} />
            </article>
          ))}
          {!hadiths.length && (
            <p className="pempty">{T.kitabEmpty[lang]}</p>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} basePath={`/kitab/${bid}`} hrefFor={pageHref} />
      </main>
      <Footer />
    </>
  );
}
