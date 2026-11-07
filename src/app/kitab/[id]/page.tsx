import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getBook, getBookHadithCount, getHadithPage, getChapterPage } from "@/lib/hadis";
import { KitabView, PER_PAGE } from "./KitabView";

export const dynamic = "force-dynamic";

type SP = Promise<{ page?: string; h?: string; s?: string; ch?: string }>;

/** Halaman 1 sandaran: /kitab/<id>/. Carian (?s=) tiada kanonik (elak URL tak terhingga). */
export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }): Promise<Metadata> {
  const { id } = await params;
  const { s } = await searchParams;
  return { alternates: { canonical: `/kitab/${id}/` }, robots: (s ?? "").trim() ? { index: false } : undefined };
}

// Laluan ini dicapai Worker sahaja bila tiada aset statik: carian (/x/kitab/<id>/?s=… ditulis semula
// ke sini) atau kitab di luar had binaan. URL lama ?page=/?h=/?ch= dialihkan kekal ke halaman statik.
export default async function KitabPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const { page: pageStr, h: hStr, s: sStr, ch: chStr } = await searchParams;
  const bid = Number(id);
  if (!Number.isInteger(bid)) notFound();
  const search = (sStr ?? "").trim();
  const dest = (p: number) => `/kitab/${bid}/${p > 1 ? `${p}/` : ""}`;

  if (!search) {
    const targetHadith = Number(hStr) || 0;
    const targetChapter = Number(chStr) || 0;
    if (targetHadith || targetChapter || Number(pageStr) > 1) {
      if (!(await getBook(bid))) notFound();
      const total = await getBookHadithCount(bid);
      const last = Math.max(1, Math.ceil(total / PER_PAGE));
      const p = targetHadith ? await getHadithPage(bid, targetHadith, PER_PAGE)
        : targetChapter ? await getChapterPage(bid, targetChapter, PER_PAGE) : Number(pageStr);
      permanentRedirect(dest(Math.min(Math.max(1, p), last)));
    }
  }
  return <KitabView bid={bid} requestedPage={Number(pageStr) || 1} search={search} />;
}
