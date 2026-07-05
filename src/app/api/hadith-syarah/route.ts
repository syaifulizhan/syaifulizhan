import { NextResponse, type NextRequest } from "next/server";
import { getSyarahForBab } from "@/lib/hadis";

export const dynamic = "force-dynamic";

// Syarah bagi باب hadis — dimuat bila pembaca BUKA (elak teks besar dlm SSR).
// ?book=<hadith_book_id>&kt=<kitab_title>&bab=<bab_title>.
export async function GET(req: NextRequest) {
  const book = Number(req.nextUrl.searchParams.get("book"));
  const kt = req.nextUrl.searchParams.get("kt") ?? "";
  const bab = req.nextUrl.searchParams.get("bab") ?? "";
  if (!book || !kt || !bab) return NextResponse.json({ text: "" }, { status: 400 });
  const res = await getSyarahForBab(book, kt, bab);
  return NextResponse.json({ text: res?.text ?? "", book: res?.book ?? null });
}
