import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KitabView } from "../KitabView";

export const dynamic = "force-dynamic";

type P = Promise<{ id: string; n: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { id, n } = await params;
  return { alternates: { canonical: `/kitab/${id}/${n}/` } };
}

// Sandaran SSR untuk /kitab/<id>/<n>/ bila aset statik tiada (kitab di luar had binaan).
export default async function KitabPageN({ params }: { params: P }) {
  const { id, n } = await params;
  const bid = Number(id);
  const page = Number(n);
  if (!Number.isInteger(bid) || !Number.isInteger(page) || page < 1) notFound();
  return <KitabView bid={bid} requestedPage={page} search="" />;
}
