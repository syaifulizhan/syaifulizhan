/**
 * Sesi admin — token bertandatangan HMAC-SHA256 (Web Crypto, serasi Cloudflare
 * Workers + Node). Cookie simpan token, BUKAN rahsia mentah. Tiada next/headers
 * di sini supaya selamat diimport oleh middleware.
 */
const ENC = new TextEncoder();
const DEC = new TextDecoder();

export const SESSION_COOKIE = "diz_sess";
export const OAUTH_STATE_COOKIE = "diz_oauth_state";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 jam

export interface AdminSession {
  login: string;
  name: string;
  exp: number;
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(b64: string): Uint8Array {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", ENC.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(payload: AdminSession, secret = process.env.SESSION_SECRET): Promise<string> {
  if (!secret) throw new Error("SESSION_SECRET tidak diset");
  const body = bytesToB64url(ENC.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), ENC.encode(body));
  return `${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined, secret = process.env.SESSION_SECRET): Promise<AdminSession | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), b64urlToBytes(sig) as BufferSource, ENC.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(DEC.decode(b64urlToBytes(body))) as AdminSession;
    if (!payload.login || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function allowedLogins(): string[] {
  return (process.env.ADMIN_GITHUB_LOGINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function isAllowed(login: string): boolean {
  const a = allowedLogins();
  return a.length > 0 && a.includes(login.toLowerCase());
}
