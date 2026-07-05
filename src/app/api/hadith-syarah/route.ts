import { NextResponse, type NextRequest } from "next/server";
import { getSyarahForBab } from "@/lib/hadis";

export const dynamic = "force-dynamic";

// Syarah (Fath al-Bari) bagi باب hadis — dimuat bila pembaca BUKA (elak teks besar dlm SSR).
// ?book=<hadith_book_id>&kitab=<kitab_no>&bab=<bab_title>.
export async function GET(req: NextRequest) {
  const book = Number(req.nextUrl.searchParams.get("book"));
  const kitab = Number(req.nextUrl.searchParams.get("kitab"));
  const bab = req.nextUrl.searchParams.get("bab") ?? "";
  if (!book || !kitab || !bab) return NextResponse.json({ text: "" }, { status: 400 });
  const res = await getSyarahForBab(book, kitab, bab);
  return NextResponse.json({ text: res?.text ?? "", book: res?.book ?? null });
}
