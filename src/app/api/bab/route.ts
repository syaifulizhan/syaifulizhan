import { NextResponse, type NextRequest } from "next/server";
import { getBookBab } from "@/lib/hadis";

export const dynamic = "force-dynamic";

// باب bagi satu كتاب (ToC sub-item) — dimuat bila كتاب dikembang.
// ?book=<hadith_book_id>&kitab=<kitab_no>.
export async function GET(req: NextRequest) {
  const book = Number(req.nextUrl.searchParams.get("book"));
  const kitab = Number(req.nextUrl.searchParams.get("kitab"));
  if (!book || !kitab) return NextResponse.json({ bab: [] }, { status: 400 });
  return NextResponse.json({ bab: await getBookBab(book, kitab) });
}
