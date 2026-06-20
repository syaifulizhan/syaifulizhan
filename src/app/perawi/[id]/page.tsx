import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { getNarrator, getGrades, getTeachers, getStudents, type Edge } from "@/lib/narrators";

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

  const [grades, teachers, students] = await Promise.all([
    getGrades(nid),
    getTeachers(nid),
    getStudents(nid),
  ]);

  const info: [string, string | number | null][] = [
    ["Kunya", n.kunya],
    ["Nisbah", n.nisba],
    ["Pekerjaan", n.profession],
    ["Tinggal di", n.regions],
    ["Naungan", n.mawla],
    ["Wafat", n.death_year ? `${n.death_year} H` : null],
    ["Tempat wafat", n.death_place],
  ];
  const infoShown = info.filter(([, v]) => v);

  return (
    <>
      <Nav />
      <main className="pwrap">
        <div className="pcrumb">
          <Link href="/perawi">Perawi</Link>
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
            <div className="psec-t">Maklumat</div>
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
            <div className="psec-t">Jarh wa Taʿdil — penilaian ulama</div>
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

        <div className="psec-t">Graf Sanad — guru &amp; murid</div>
        <div className="pgraph">
          <div className="pcol">
            <h4>
              Guru <span className="cnt">({teachers.length})</span>
            </h4>
            <div className="pnodes">
              {teachers.length ? (
                teachers.map((e) => <Person key={e.id} e={e} />)
              ) : (
                <div className="pempty">Belum ada guru terpadan (graf membesar bila scrape penuh selesai).</div>
              )}
            </div>
          </div>
          <div className="pcol">
            <h4>
              Murid <span className="cnt">({students.length})</span>
            </h4>
            <div className="pnodes">
              {students.length ? (
                students.map((e) => <Person key={e.id} e={e} />)
              ) : (
                <div className="pempty">Belum ada murid terpadan.</div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
