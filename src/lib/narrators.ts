import { corpus } from "./db";
import { normalizeArabic } from "./arabic";

export interface Narrator {
  id: number;
  name_ar: string;
  shuhra: string | null;
  kunya: string | null;
  nisba: string | null;
  rutbah: string | null;
  profession: string | null;
  regions: string | null;
  mawla: string | null;
  death_year: number | null;
  death_place: string | null;
  bio_ar: string | null;
}
export interface Grade { scholar: string | null; verdict: string | null; }
export interface Edge { id: number; name_ar: string; rutbah: string | null; death_year: number | null; }

export async function getNarrator(id: number): Promise<Narrator | null> {
  const r = await corpus.execute({ sql: "SELECT * FROM narrators WHERE id = ?", args: [id] });
  return (r.rows[0] as unknown as Narrator) ?? null;
}

export async function getGrades(id: number): Promise<Grade[]> {
  const r = await corpus.execute({
    sql: "SELECT scholar, verdict FROM narrator_grades WHERE narrator_id = ?",
    args: [id],
  });
  return r.rows as unknown as Grade[];
}

export async function getTeachers(id: number): Promise<Edge[]> {
  const r = await corpus.execute({
    sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year
            FROM narrator_relations r JOIN narrators n ON n.id = r.teacher_id
           WHERE r.student_id = ?
           ORDER BY (n.death_year IS NULL), n.death_year`,
    args: [id],
  });
  return r.rows as unknown as Edge[];
}

export async function getStudents(id: number): Promise<Edge[]> {
  const r = await corpus.execute({
    sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year
            FROM narrator_relations r JOIN narrators n ON n.id = r.student_id
           WHERE r.teacher_id = ?
           ORDER BY (n.death_year IS NULL), n.death_year`,
    args: [id],
  });
  return r.rows as unknown as Edge[];
}

export async function searchNarrators(q: string, limit = 40): Promise<Edge[]> {
  const norm = normalizeArabic(q);
  if (!norm) {
    const r = await corpus.execute({
      sql: "SELECT id, name_ar, rutbah, death_year FROM narrators ORDER BY id LIMIT ?",
      args: [limit],
    });
    return r.rows as unknown as Edge[];
  }
  // setiap token jadi awalan FTS5
  const match = norm.split(" ").filter(Boolean).map((t) => `${t}*`).join(" ");
  const r = await corpus.execute({
    sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year
            FROM narrators_fts f JOIN narrators n ON n.id = f.rowid
           WHERE narrators_fts MATCH ? LIMIT ?`,
    args: [match, limit],
  });
  return r.rows as unknown as Edge[];
}

export async function narratorCount(): Promise<number> {
  const r = await corpus.execute("SELECT count(*) c FROM narrators");
  return Number(r.rows[0].c);
}
