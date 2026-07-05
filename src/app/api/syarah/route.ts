import { NextResponse, type NextRequest } from "next/server";
import { getSharahForKitab } from "@/lib/hadis";

export const dynamic = "force-dynamic";

// Syarah per كتاب — dimuat bila pembaca BUKA (elak benam teks besar dlm SSR setiap
// halaman kitab). ?book=<hadith_book_id>&kitab=<kitab_no>.
export async function GET(req: NextRequest) {
  const book = Number(req.nextUrl.searchParams.get("book"));
  const kitab = Number(req.nextUrl.searchParams.get("kitab"));
  if (!book || !kitab) return NextResponse.json({ segs: [] }, { status: 400 });
  const res = await getSharahForKitab(book, kitab);
  return NextResponse.json({ segs: res?.segs ?? [] });
}
