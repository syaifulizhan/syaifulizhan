import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { getNarrator, getGrades, getTeachers, getStudents, EDGE_LIMIT, type Edge } from "@/lib/narrators";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Nod "ثقتان" (كلاهما ثقة): rawi ambil dari KEDUA-DUA & tak beza → papar dua calon
// SEBENAR yg boleh diklik supaya orang manfaat biodata penuh kedua-duanya.
const THIQATAN_ALTS: Record<number, number[]> = {
  9000001: [2000434, 3443], // سفيان: al-Thawrī / Ibn ʿUyaynah
};

function Person({ e }: { e: Edge }) {
  return (
    <Link href={`/perawi/${e.id}`} className="pn">
      <span className="dot" />
      <span className="pn-nm ar">{e.name_ar}</span>
      <span className="pn-meta">
        {e.rutbah ?? ""}
        {e.death_year ? ` · ت ${e.death_year}` : ""}
      </span>
    </Link>
  );
}

export default async function PerawiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ semua?: string }>;
}) {
  const { id } = await params;
  const { semua } = await searchParams;
  const edgeLimit = semua === "1" ? 5000 : EDGE_LIMIT;
  const nid = Number(id);
  if (!Number.isInteger(nid)) notFound();
  const n = await getNarrator(nid);
  if (!n) notFound();

  const [grades, teachersR, studentsR, lang] = await Promise.all([
    getGrades(nid),
    getTeachers(nid, edgeLimit),
    getStudents(nid, edgeLimit),
    getServerLang(),
  ]);
  const teachers = teachersR.rows;
  const students = studentsR.rows;
  const truncated = teachersR.total > teachers.length || studentsR.total > students.length;
  const altIds = THIQATAN_ALTS[nid] ?? [];
  const alts = altIds.length ? (await Promise.all(altIds.map((a) => getNarrator(a)))).filter(Boolean) : [];

  const info: [string, string | number | null][] = [
    [T.infoKunya[lang], n.kunya],
    [T.infoNisbah[lang], n.nisba],
    [T.infoProfession[lang], n.profession],
    [T.infoRegion[lang], n.regions],
    [T.infoMawla[lang], n.mawla],
    [T.infoDeath[lang], n.death_year ? `${n.death_year} H` : null],
    [T.infoDeathPlace[lang], n.death_place],
  ];
  const infoShown = info.filter(([, v]) => v);

  return (
    <>
      {semua === "1" && <meta name="robots" content="noindex, nofollow" />}
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <Link href="/perawi">{T.navPerawi[lang]}</Link>
          <span>›</span>
          <span className="ar">{n.name_ar}</span>
        </div>

        <header className="phead">
          <div className="pname ar">{n.name_ar}</div>
          {n.shuhra && <div className="pshuhra ar">{n.shuhra}</div>}
          <div className="pbadges">
            {n.rutbah && (
              <span className="pbadge rutbah">
                <span className="ar">{n.rutbah}</span>
              </span>
            )}
            <span className="pbadge">ID {n.id}</span>
          </div>
        </header>

        {alts.length > 0 && (
          <>
            <div className="psec-t">كلاهما ثقة — اختر الراوي لقراءة ترجمته</div>
            <div className="pnodes">
              {alts.map((a) => (
                <Link key={a!.id} href={`/perawi/${a!.id}`} className="pn">
                  <span className="dot" />
                  <span className="pn-nm ar">{a!.name_ar}</span>
                  <span className="pn-meta">
                    {a!.rutbah ?? ""}
                    {a!.death_year ? ` · ت ${a!.death_year}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {infoShown.length > 0 && (
          <>
            <div className="psec-t">{T.narrInfo[lang]}</div>
            <div className="pinfo">
              {infoShown.map(([k, v]) => (
                <div key={k}>
                  <div className="k">{k}</div>
                  <div className="v ar">{v}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {grades.length > 0 && (
          <>
            <div className="psec-t">{T.narrJarh[lang]}</div>
            <div className="pjarh">
              {grades.map((g, i) => (
                <div className="pjarh-row" key={i}>
                  <div className="sch ar">{g.scholar ?? "—"}</div>
                  <div className="vd ar">{g.verdict ?? ""}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="psec-t">{T.narrGraph[lang]}</div>
        <div className="pgraph">
          <div className="pcol">
            <h4>
              {T.narrTeachers[lang]} <span className="cnt">({teachersR.total})</span>
            </h4>
            <div className="pnodes">
              {teachers.length ? (
                teachers.map((e) => <Person key={e.id} e={e} />)
              ) : (
                <div className="pempty">{T.narrNoTeachers[lang]}</div>
              )}
            </div>
          </div>
          <div className="pcol">
            <h4>
              {T.narrStudents[lang]} <span className="cnt">({studentsR.total})</span>
            </h4>
            <div className="pnodes">
              {students.length ? (
                students.map((e) => <Person key={e.id} e={e} />)
              ) : (
                <div className="pempty">{T.narrNoStudents[lang]}</div>
              )}
            </div>
          </div>
        </div>
        {truncated && (
          <p className="pempty">
            <Link href={`/perawi/${n.id}?semua=1`} rel="nofollow">
              Papar semua guru &amp; murid
            </Link>
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
