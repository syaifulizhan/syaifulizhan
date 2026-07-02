import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Mula aliran OAuth: hantar pengguna ke GitHub untuk benarkan.
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || "",
    redirect_uri: `${base}/api/auth/github/callback`,
    scope: "read:user user:email",
    state,
    allow_signup: "false",
  });
  const res = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}
