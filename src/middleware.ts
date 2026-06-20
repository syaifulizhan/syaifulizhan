import { NextResponse, type NextRequest } from "next/server";

// Lindung papan admin dengan gerbang kata laluan (cookie httpOnly).
export function middleware(req: NextRequest) {
  const ok = req.cookies.get("diz_admin")?.value === process.env.ADMIN_PASSWORD;
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/cadangan/:path*"] };
