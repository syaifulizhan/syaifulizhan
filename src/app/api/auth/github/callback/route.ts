import { NextResponse, type NextRequest } from "next/server";
import { signSession, isAllowed, SESSION_COOKIE, OAUTH_STATE_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface TokenResp { access_token?: string }
interface GhUser { login?: string; name?: string | null }

// GitHub pulangkan pengguna ke sini dengan kod; tukar kod → token → sahkan
// allowlist → set cookie sesi bertandatangan.
export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const fail = (e: string) => NextResponse.redirect(`${base}/admin/login?e=${e}`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !saved || state !== saved) return fail("state");

  const tokRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${base}/api/auth/github/callback`,
    }),
  });
  const tok = (await tokRes.json()) as TokenResp;
  if (!tok.access_token) return fail("token");

  const uRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "dewan-izhan",
    },
  });
  const u = (await uRes.json()) as GhUser;
  if (!u.login || !isAllowed(u.login)) return fail("denied");

  const token = await signSession({ login: u.login, name: u.name || u.login, exp: Date.now() + SESSION_TTL_MS });
  const res = NextResponse.redirect(`${base}/admin`);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
