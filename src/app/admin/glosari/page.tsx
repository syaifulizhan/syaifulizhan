import { hadithDb } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";
import { updateGlossary, addGlossary, deleteGlossary } from "@/app/actions";

export const dynamic = "force-dynamic";

interface Row {
  rowid: number;
  term_ar: string;
  translit: string | null;
  term_ms: string | null;
  term_en: string | null;
  def_ar: string | null;
  def_ms: string | null;
  def_en: string | null;
  source: string | null;
}

async function search(q: string): Promise<Row[]> {
  try {
    if (!q) {
      const r = await hadithDb.execute("SELECT rowid,* FROM glossary ORDER BY rowid DESC LIMIT 40");
      return r.rows as unknown as Row[];
    }
    const n = `%${normalizeArabic(q)}%`;
    const l = `%${q.toLowerCase()}%`;
    const r = await hadithDb.execute({
      sql: `SELECT rowid,* FROM glossary
            WHERE term_search LIKE ? OR LOWER(translit) LIKE ? OR LOWER(term_ms) LIKE ? OR LOWER(term_en) LIKE ?
            ORDER BY term_ar LIMIT 60`,
      args: [n, l, l, l],
    });
    return r.rows as unknown as Row[];
  } catch {
    return [];
  }
}

function Field({ name, val, label, area }: { name: string; val: string | null; label: string; area?: boolean }) {
  return (
    <label className="adm-f">
      <span>{label}</span>
      {area ? (
        <textarea name={name} defaultValue={val ?? ""} rows={3} />
      ) : (
        <input name={name} defaultValue={val ?? ""} />
      )}
    </label>
  );
}

export default async function AdminGlosari({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await search(q);

  return (
    <main>
      <h1 className="adm-h1">Glosari</h1>
      <p className="adm-sub">Edit terus disimpan live ke D1. Cari istilah (Arab/rumi/BM/EN), atau tambah baharu.</p>

      <form className="adm-search" method="get">
        <input name="q" defaultValue={q} placeholder="Cari istilah…" autoFocus />
        <button className="btn solid" type="submit">Cari</button>
      </form>

      <details className="adm-add">
        <summary>+ Tambah istilah baharu</summary>
        <form action={addGlossary} className="adm-grid">
          <Field name="term_ar" val="" label="Istilah Arab *" />
          <Field name="translit" val="" label="Transliterasi" />
          <Field name="term_ms" val="" label="Nama BM" />
          <Field name="term_en" val="" label="Nama EN" />
          <Field name="def_ms" val="" label="Definisi BM" area />
          <Field name="def_ar" val="" label="Definisi Arab" area />
          <Field name="def_en" val="" label="Definisi EN" area />
          <button className="btn solid" type="submit">Simpan istilah</button>
        </form>
      </details>

      <p className="adm-count">{rows.length} hasil</p>
      {rows.map((r) => (
        <details className="adm-row" key={r.rowid}>
          <summary>
            <span className="ar">{r.term_ar}</span>
            <span className="adm-row-ms">{r.term_ms || r.translit || "—"}</span>
            {r.source && <span className="adm-tag">{r.source}</span>}
          </summary>
          <form action={updateGlossary} className="adm-grid">
            <input type="hidden" name="rowid" value={r.rowid} />
            <Field name="term_ar" val={r.term_ar} label="Istilah Arab *" />
            <Field name="translit" val={r.translit} label="Transliterasi" />
            <Field name="term_ms" val={r.term_ms} label="Nama BM" />
            <Field name="term_en" val={r.term_en} label="Nama EN" />
            <Field name="def_ms" val={r.def_ms} label="Definisi BM" area />
            <Field name="def_ar" val={r.def_ar} label="Definisi Arab" area />
            <Field name="def_en" val={r.def_en} label="Definisi EN" area />
            <div className="adm-actions">
              <button className="btn solid" type="submit">Simpan</button>
            </div>
          </form>
          <form action={deleteGlossary} className="adm-del">
            <input type="hidden" name="rowid" value={r.rowid} />
            <button className="btn ghost danger" type="submit">Padam istilah ini</button>
          </form>
        </details>
      ))}
      {rows.length === 0 && <p className="pempty">Tiada hasil.</p>}
    </main>
  );
}
