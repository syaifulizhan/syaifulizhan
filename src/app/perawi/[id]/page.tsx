import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { getNarrator, getGrades, getTeachers, getStudents, type Edge } from "@/lib/narrators";
import { getServerLang } from "@/lib/lang-server";
import { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

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

export default async function PerawiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nid = Number(id);
  if (!Number.isInteger(nid)) notFound();
  const n = await getNarrator(nid);
  if (!n) notFound();

  const [grades, teachers, students, lang] = await Promise.all([
    getGrades(nid),
    getTeachers(nid),
    getStudents(nid),
    getServerLang(),
  ]);

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
              {T.narrTeachers[lang]} <span className="cnt">({teachers.length})</span>
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
              {T.narrStudents[lang]} <span className="cnt">({students.length})</span>
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
      </main>
      <Footer />
    </>
  );
}
