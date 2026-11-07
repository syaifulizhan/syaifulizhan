import { NextResponse, type NextRequest } from "next/server";
import { submitSuggestion } from "@/app/actions";

export const dynamic = "force-dynamic";

const ORIGINS = new Set(["https://syaifulizhan.my", "https://www.syaifulizhan.my"]);
const ENTITY_TYPES = new Set(["hadith", "narrator", "translation"]); // sama seperti SuggestForm/submitSuggestion
const MAX = { suggested_text: 4000, reason: 500, submitter: 200, current_text: 8000, field: 40, lang: 8 } as const;

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // GET-navigasi/same-origin lama tanpa Origin
  if (ORIGINS.has(origin)) return true;
  return process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

// Cadangan pembetulan dari halaman statik (tiada server action tanpa React). AWAM, sama seperti submitSuggestion.
export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const fd = await req.formData();
  if (String(fd.get("website") ?? "").trim()) return NextResponse.json({ ok: true }); // honeypot: diam-diam, tiada insert
  if (!ENTITY_TYPES.has(String(fd.get("entity_type") ?? ""))) return NextResponse.json({ ok: false }, { status: 400 });
  for (const [k, max] of Object.entries(MAX)) {
    if (String(fd.get(k) ?? "").length > max) return NextResponse.json({ ok: false }, { status: 413 });
  }
  const res = await submitSuggestion(fd);
  return NextResponse.json({ ok: !!res?.ok }, { status: res?.ok ? 200 : 400 });
}
