import { NextResponse, type NextRequest } from "next/server";
import { getRulingsFor } from "@/lib/hadis";

export const dynamic = "force-dynamic";

// Hukum & takhrij yang dilipat untuk satu hadis (halaman kitab statik hanya memancar yang primer).
// ?h=<hadith_id> → { rest: Ruling[] } (urutan sama dengan komponen Rulings).
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("h"));
  if (!id) return NextResponse.json({ rest: [] }, { status: 400 });
  const all = (await getRulingsFor([id])).get(id) ?? [];
  const primary = all.filter((r) => r.is_primary);
  return NextResponse.json({ rest: primary.length ? all.filter((r) => !r.is_primary) : all.slice(1) });
}
