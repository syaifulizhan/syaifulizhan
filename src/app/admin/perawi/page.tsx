import { corpus } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";
import { updateNarrator } from "@/app/actions";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

interface N {
  id: number;
  name_ar: string;
  shuhra: string | null;
  kunya: string | null;
  nisba: string | null;
  rutbah: string | null;
  profession: string | null;
  death_year: number | null;
  death_place: string | null;
  bio_ar: string | null;
}

const PER = 25;
// Cari ATAU browse SEMUA perawi (ikut halaman) — admin nampak semua, boleh edit.
async function search(q: string, page: number): Promise<{ rows: N[]; total: number; down: boolean }> {
  try {
    if (/^\d+$/.test(q)) {
      const r = await corpus.execute({ sql: "SELECT * FROM narrators WHERE id=? LIMIT 1", args: [Number(q)] });
      return { rows: r.rows as unknown as N[], total: 0, down: false };
    }
    if (q) {
      const match = normalizeArabic(q).split(" ").filter(Boolean).map((t) => `${t}*`).join(" ");
      const r = await corpus.execute({ sql: `SELECT n.* FROM narrators_fts f JOIN narrators n ON n.id=f.rowid WHERE narrators_fts MATCH ? LIMIT 40`, args: [match] });
      return { rows: r.rows as unknown as N[], total: 0, down: false };
    }
    const total = Number((await corpus.execute("SELECT COUNT(*) c FROM narrators")).rows[0].c);
    const r = await corpus.execute({ sql: "SELECT * FROM narrators ORDER BY id LIMIT ? OFFSET ?", args: [PER, (page - 1) * PER] });
    return { rows: r.rows as unknown as N[], total, down: false };
  } catch {
    return { rows: [], total: 0, down: true };
  }
}

export default async function AdminPerawi({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page: pageStr = "" } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const { rows, total, down } = await search(q, page);
  const totalPages = Math.max(1, Math.ceil(total / PER));

  return (
    <main>
      <h1 className="adm-h1">Perawi</h1>
      <p className="adm-sub">Edit biografi perawi. <em>Korpus perawi di Turso</em> — simpanan live aktif bila kuota Turso pulih.</p>
      {down && <p className="adm-warn">⚠️ Turso tidak dapat dicapai sekarang (kemungkinan kuota bulanan). Carian & simpanan perawi akan pulih bila kuota reset, atau selepas perawi dipindah ke D1.</p>}

      <form className="adm-search" method="get">
        <input name="q" defaultValue={q} placeholder="Cari nama perawi (Arab) atau No. ID…" autoFocus />
        <button className="btn solid" type="submit">Cari</button>
      </form>

      <p className="adm-count">{q ? `${rows.length} hasil` : `${total.toLocaleString("en-US")} perawi · halaman ${page}/${totalPages}`}</p>
      {rows.map((n) => (
        <details className="adm-row" key={n.id}>
          <summary>
            <span className="adm-tag">#{n.id}</span>
            <span className="ar">{n.name_ar}</span>
            {n.rutbah && <span className="adm-tag">{n.rutbah}</span>}
          </summary>
          <form action={updateNarrator} className="adm-grid">
            <input type="hidden" name="id" value={n.id} />
            <label className="adm-f"><span>Nama Arab *</span><input name="name_ar" defaultValue={n.name_ar ?? ""} dir="rtl" /></label>
            <label className="adm-f"><span>Shuhrah</span><input name="shuhra" defaultValue={n.shuhra ?? ""} /></label>
            <label className="adm-f"><span>Kunyah</span><input name="kunya" defaultValue={n.kunya ?? ""} /></label>
            <label className="adm-f"><span>Nisbah</span><input name="nisba" defaultValue={n.nisba ?? ""} /></label>
            <label className="adm-f"><span>Rutbah (darjat)</span><input name="rutbah" defaultValue={n.rutbah ?? ""} /></label>
            <label className="adm-f"><span>Profesion</span><input name="profession" defaultValue={n.profession ?? ""} /></label>
            <label className="adm-f"><span>Tahun wafat (H)</span><input name="death_year" type="number" defaultValue={n.death_year ?? ""} /></label>
            <label className="adm-f"><span>Tempat wafat</span><input name="death_place" defaultValue={n.death_place ?? ""} /></label>
            <label className="adm-f"><span>Biografi (Arab)</span><textarea name="bio_ar" defaultValue={n.bio_ar ?? ""} rows={4} dir="rtl" /></label>
            <div className="adm-actions"><button className="btn solid" type="submit">Simpan</button></div>
          </form>
        </details>
      ))}
      {rows.length === 0 && !down && <p className="pempty">Tiada hasil.</p>}
      {!q && !down && <Pagination page={page} totalPages={totalPages} basePath="/admin/perawi" />}
    </main>
  );
}
