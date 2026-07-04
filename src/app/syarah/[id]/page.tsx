import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { Pagination } from "@/components/Pagination";
import { getSharahBook, getSharahPages, getSharahPageCount } from "@/lib/hadis";
import { getServerLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";
const PER_PAGE = 5;

// Bersih teks turath: buang penanda halaman ~{buku}-{ms}, tukar title span → heading,
// buang tag lain. Pulang senarai segmen {heading?, text} utk render kemas.
function cleanTurath(raw: string): { heading: string | null; text: string }[] {
  let t = raw.replace(/^~[\d٠-٩]+-[\d٠-٩]+\s*/, "");
  // pecah pada title span
  const parts = t.split(/(<span[^>]*data-type="title"[^>]*>[\s\S]*?<\/span>)/g);
  const out: { heading: string | null; text: string }[] = [];
  for (const p of parts) {
    const m = p.match(/data-type="title"[^>]*>([\s\S]*?)<\/span>/);
    if (m) out.push({ heading: m[1].replace(/<[^>]+>/g, "").trim(), text: "" });
    else {
      const txt = p.replace(/<span[^>]*data-type="footnote"[^>]*>[\s\S]*?<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (txt) {
        if (out.length && !out[out.length - 1].text) out[out.length - 1].text = txt;
        else out.push({ heading: null, text: txt });
      }
    }
  }
  return out.length ? out : [{ heading: null, text: t.replace(/<[^>]+>/g, "").trim() }];
}

const L = {
  crumb: { bm: "Syarah", en: "Sharh", ar: "الشروح" },
  by: { bm: "oleh", en: "by", ar: "لـ" },
  ph: { bm: "Cari dalam syarah…", en: "Search sharh…", ar: "ابحث في الشرح…" },
  page: { bm: "Halaman", en: "Page", ar: "صفحة" },
  vol: { bm: "Jilid", en: "Vol", ar: "ج" },
  empty: { bm: "Tiada hasil.", en: "No results.", ar: "لا نتائج." },
} as const;

export default async function SyarahPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; s?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr, s: sStr } = await searchParams;
  const bid = Number(id);
  if (!Number.isInteger(bid)) notFound();
  const book = await getSharahBook(bid);
  if (!book) notFound();
  const lang = await getServerLang();
  const search = (sStr ?? "").trim();
  const total = await getSharahPageCount(bid, search);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, Number(pageStr) || 1), totalPages);
  const pages = await getSharahPages(bid, PER_PAGE, (page - 1) * PER_PAGE, search);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <Link href="/syarah">{L.crumb[lang]}</Link><span>›</span>
          <span className="ar">{book.name}</span>
        </div>
        <header className="phead">
          <div className="pname ar">{book.name}</div>
          {book.author && <div className="pshuhra ar">{L.by[lang]} {book.author}</div>}
          <div className="pbadges">
            <span className="pbadge">{book.npages.toLocaleString("en-US")} {L.page[lang]}</span>
            {book.book_ref && <Link className="pbadge" href={`/kitab/${book.book_ref}`}>↩ {L.crumb[lang]}</Link>}
          </div>
        </header>

        <form className="bnav-search" method="get" action={`/syarah/${bid}`} style={{ margin: "18px 0" }}>
          <input name="s" defaultValue={search} placeholder={L.ph[lang]} dir="rtl" className="ar" />
          <button className="btn solid" type="submit">⌕</button>
          {search && <a className="bnav-clear" href={`/syarah/${bid}`}>✕</a>}
        </form>

        <div>
          {pages.map((p) => (
            <article className="scard" key={p.idx}>
              <div className="scard-top">{p.vol ? `${L.vol[lang]} ${p.vol} · ` : ""}{L.page[lang]} {p.page ?? p.idx + 1}</div>
              {cleanTurath(p.text).map((seg, i) => (
                <div key={i}>
                  {seg.heading && <h3 className="stext-h ar">{seg.heading}</h3>}
                  {seg.text && <p className="stext ar">{seg.text}</p>}
                </div>
              ))}
            </article>
          ))}
          {!pages.length && <p className="pempty">{L.empty[lang]}</p>}
        </div>
        <Pagination page={page} totalPages={totalPages} basePath={`/syarah/${bid}`} extraQuery={search ? `s=${encodeURIComponent(search)}` : ""} />
      </main>
      <Footer />
    </>
  );
}
