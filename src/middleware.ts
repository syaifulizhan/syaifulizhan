import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Gerbang papan admin: hanya sesi GitHub bertandatangan dibenarkan.
// /admin/login & /api/auth/* dibiar terbuka (proses log masuk).
export async function middleware(req: NextRequest) {
  // Normalkan trailing slash (next.config trailingSlash: true).
  const pathname = req.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/admin/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
