import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { KitabView } from "./KitabView";

export const dynamic = "force-dynamic";

type SP = Promise<{ page?: string; s?: string }>;

// Carian padanan teks dalam satu kitab: tiada kanonik/indeks (elak URL tak terhingga).
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Laluan SSR Next ini HANYA untuk carian dalam kitab. Worker menulis semula /x/kitab/<id>/?s=… ke sini.
// Halaman kitab biasa (/kitab/<id>/, /kitab/<id>/<n>/) = aset statik atau Worker (src/static/kitab-route.ts).
export default async function KitabCariPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const { page: pageStr, s } = await searchParams;
  const bid = Number(id);
  if (!Number.isInteger(bid) || bid < 1) notFound();
  const search = (s ?? "").trim();
  if (!search) redirect(`/kitab/${bid}/`);
  return <KitabView bid={bid} requestedPage={Number(pageStr) || 1} search={search} />;
}
