import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Proxy sisi-Worker utk الموسوعة الحديثية (dorar.net). IP rumah disekat CF dorar;
// Worker (IP awan) tidak. Dipagar token (DORAR_KEY) supaya bukan terbuka umum.
// Guna: GET /api/dorar?skey=<matn>&key=<token>  → pulang JSON mentah dorar.
// Hormat kadar dorar: pemanggil (skrip) mesti selang; jangan hammer.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.DORAR_KEY;
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const skey = req.nextUrl.searchParams.get("skey");
  if (!skey || skey.length < 3) {
    return NextResponse.json({ error: "skey diperlukan" }, { status: 400 });
  }
  const path = req.nextUrl.searchParams.get("path"); // cth /hadith/sharh/1608 utk syarah
  const url = path
    ? `https://dorar.net${path}`
    : `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(skey)}`;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ar,en;q=0.9",
        "Referer": "https://dorar.net/",
        "Origin": "https://dorar.net",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    });
    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
