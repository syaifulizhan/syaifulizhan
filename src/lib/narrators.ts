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
  bio_ar?: string | null; // tidak dipilih dalam getNarrator (teks besar, tidak dipaparkan)
}
export interface Grade { scholar: string | null; verdict: string | null; }
export interface Edge { id: number; name_ar: string; rutbah: string | null; death_year: number | null; }
export interface EdgeList { rows: Edge[]; total: number; }

// Had baris graf guru/murid yang di-SSR (perawi masyhur ada ribuan murid → CPU Worker 10 ms terlebih).
export const EDGE_LIMIT = 100;

// Korpus perawi di Turso. Bila Turso down/kuota (sementara tunggu reset), pulang
// nilai selamat supaya halaman render dgn anggun (bukan 500). Pindah ke D1 nanti.
async function safe<X>(fn: () => Promise<X>, fallback: X): Promise<X> {
  try { return await fn(); } catch { return fallback; }
}

export async function getNarrator(id: number): Promise<Narrator | null> {
  return safe(async () => {
    const r = await corpus.execute({ sql: "SELECT id, name_ar, shuhra, kunya, nisba, rutbah, profession, regions, mawla, death_year, death_place FROM narrators WHERE id = ?", args: [id] });
    return (r.rows[0] as unknown as Narrator) ?? null;
  }, null);
}

export async function getGrades(id: number): Promise<Grade[]> {
  return safe(async () => {
    const r = await corpus.execute({
      sql: "SELECT scholar, verdict FROM narrator_grades WHERE narrator_id = ?",
      args: [id],
    });
    return r.rows as unknown as Grade[];
  }, []);
}

export async function getTeachers(id: number, limit = EDGE_LIMIT): Promise<EdgeList> {
  return safe(async () => {
    const r = await corpus.execute({
      sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year, COUNT(*) OVER () AS total
              FROM narrator_relations r JOIN narrators n ON n.id = r.teacher_id
             WHERE r.student_id = ?
             ORDER BY (n.death_year IS NULL), n.death_year
             LIMIT ?`,
      args: [id, limit],
    });
    const rows = r.rows.map((x) => ({ id: Number(x.id), name_ar: x.name_ar as string, rutbah: x.rutbah as string | null, death_year: x.death_year == null ? null : Number(x.death_year) }));
    return { rows, total: r.rows.length ? Number(r.rows[0].total) : 0 };
  }, { rows: [], total: 0 });
}

export async function getStudents(id: number, limit = EDGE_LIMIT): Promise<EdgeList> {
  return safe(async () => {
    const r = await corpus.execute({
      sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year, COUNT(*) OVER () AS total
              FROM narrator_relations r JOIN narrators n ON n.id = r.student_id
             WHERE r.teacher_id = ?
             ORDER BY (n.death_year IS NULL), n.death_year
             LIMIT ?`,
      args: [id, limit],
    });
    const rows = r.rows.map((x) => ({ id: Number(x.id), name_ar: x.name_ar as string, rutbah: x.rutbah as string | null, death_year: x.death_year == null ? null : Number(x.death_year) }));
    return { rows, total: r.rows.length ? Number(r.rows[0].total) : 0 };
  }, { rows: [], total: 0 });
}

export async function searchNarrators(q: string, limit = 40): Promise<Edge[]> {
  return safe(async () => {
    const norm = normalizeArabic(q);
    if (!norm) {
      const r = await corpus.execute({
        sql: "SELECT id, name_ar, rutbah, death_year FROM narrators ORDER BY id LIMIT ?",
        args: [limit],
      });
      return r.rows as unknown as Edge[];
    }
    const match = norm.split(" ").filter(Boolean).map((t) => `${t}*`).join(" ");
    const r = await corpus.execute({
      sql: `SELECT n.id, n.name_ar, n.rutbah, n.death_year
              FROM narrators_fts f JOIN narrators n ON n.id = f.rowid
             WHERE narrators_fts MATCH ? LIMIT ?`,
      args: [match, limit],
    });
    return r.rows as unknown as Edge[];
  }, []);
}

export async function narratorCount(): Promise<number> {
  return safe(async () => {
    const r = await corpus.execute("SELECT count(*) c FROM narrators");
    return Number(r.rows[0].c);
  }, 0);
}
