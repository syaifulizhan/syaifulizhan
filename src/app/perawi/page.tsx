import Link from "next/link";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { searchNarrators, narratorCount } from "@/lib/narrators";

export const dynamic = "force-dynamic";

export default async function PerawiIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [results, total] = await Promise.all([searchNarrators(q, 60), narratorCount()]);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="psec-t">Penjelajah Perawi</div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "2.4rem", marginBottom: "6px" }}>
          Perawi Hadis
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
          {total.toLocaleString("ms-MY")} perawi dalam korpus setakat ini.
        </p>

        <form className="psearch" action="/perawi" method="get">
          <input name="q" defaultValue={q} placeholder="Cari nama perawi… (cth: آدم)" />
          <button className="btn solid" type="submit">
            Cari
          </button>
        </form>

        <div className="presults">
          {results.map((e) => (
            <Link key={e.id} href={`/perawi/${e.id}`} className="pn">
              <span className="dot" />
              <span className="pn-nm ar">{e.name_ar}</span>
              <span className="pn-meta">{e.rutbah ?? ""}</span>
            </Link>
          ))}
        </div>

        {q && results.length === 0 && (
          <p className="pempty">Tiada perawi padan “{q}”.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
