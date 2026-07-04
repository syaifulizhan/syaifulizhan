import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { listSharahBooks } from "@/lib/hadis";
import { getServerLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

const L = {
  title: { bm: "Syarah Kitab", en: "Sharh (Commentaries)", ar: "شروح الكتب" },
  sub: { bm: "Kitab syarah teks penuh — dari kurun klasik.", en: "Full-text commentaries — from the classical era.", ar: "شروح كاملة النص" },
  by: { bm: "oleh", en: "by", ar: "لـ" },
  page: { bm: "hlm", en: "pp", ar: "ص" },
  empty: { bm: "Belum ada kitab syarah. Sedang dibina.", en: "No commentaries yet.", ar: "لا شروح بعد." },
} as const;

export default async function SyarahIndex() {
  const lang = await getServerLang();
  const books = await listSharahBooks();
  return (
    <>
      <Nav />
      <main className="pwrap">
        <header className="phead">
          <div className="pname">{L.title[lang]}</div>
          <p className="adm-sub">{L.sub[lang]}</p>
        </header>
        <div className="hbooks" style={{ marginTop: "24px" }}>
          {books.map((b) => (
            <Link href={`/syarah/${b.id}`} key={b.id} className="hbook">
              <span className="t ar">{b.name}{b.author ? ` — ${b.author}` : ""}</span>
              <span className="n">{b.npages.toLocaleString("en-US")} {L.page[lang]}</span>
            </Link>
          ))}
          {!books.length && <p className="pempty">{L.empty[lang]}</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
