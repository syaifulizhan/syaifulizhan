import { NextResponse } from "next/server";
import { corpus } from "@/lib/db";

export const dynamic = "force-dynamic";

// SEMENTARA — diagnosis corpus (Turso) di API route.
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    out.hasUrl_ctx = !!env.TURSO_DATABASE_URL;
    out.hasTok_ctx = !!env.TURSO_AUTH_TOKEN;
    out.urlHost_ctx = String(env.TURSO_DATABASE_URL ?? "").replace(/\/\/([^.]*).*/, "//$1***");
  } catch (e) { out.ctxErr = String(e); }
  out.hasUrl_procenv = !!process.env.TURSO_DATABASE_URL;
  try {
    const r = await corpus.execute("SELECT COUNT(*) c FROM sharh_segment");
    out.sharhCount = (r.rows[0] as { c: unknown })?.c;
  } catch (e) { out.corpusErr = String(e); }
  return NextResponse.json(out);
}
