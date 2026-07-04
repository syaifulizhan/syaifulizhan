import { hadithDb } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";
import { updateHadith, updateSanad } from "@/app/actions";
import { getIsnadFor, getSanadOverridesFor } from "@/lib/hadis";

export const dynamic = "force-dynamic";

interface H {
  id: number;
  book_id: number | null;
  chapter_ar: string | null;
  number: number | null;
  matn_ar: string | null;
  grade: string | null;
  title_ar: string | null;
}

async function search(q: string): Promise<{ rows: H[]; tr: Map<string, string> }> {
  try {
    let rows: H[] = [];
    const sel = `SELECT h.id, h.book_id, h.chapter_ar, h.number, h.matn_ar, h.grade, b.title_ar
                 FROM hadiths h LEFT JOIN books b ON b.id = h.book_id`;
    if (/^\d+$/.test(q)) {
      const r = await hadithDb.execute({ sql: `${sel} WHERE h.id = ? LIMIT 1`, args: [Number(q)] });
      rows = r.rows as unknown as H[];
    } else if (q) {
      const r = await hadithDb.execute({ sql: `${sel} WHERE h.matn_search LIKE ? LIMIT 40`, args: [`%${normalizeArabic(q)}%`] });
      rows = r.rows as unknown as H[];
    } else {
      const r = await hadithDb.execute(`${sel} ORDER BY h.id LIMIT 25`);
      rows = r.rows as unknown as H[];
    }
    const tr = new Map<string, string>();
    if (rows.length) {
      const ids = rows.map((h) => h.id);
      const ph = ids.map(() => "?").join(",");
      const t = await hadithDb.execute({
        sql: `SELECT entity_id, lang, text FROM translations WHERE entity_type='hadith' AND entity_id IN (${ph})`,
        args: ids,
      });
      for (const row of t.rows as unknown as { entity_id: number; lang: string; text: string }[]) {
        tr.set(`${row.entity_id}:${row.lang}`, row.text);
      }
    }
    return { rows, tr };
  } catch {
    return { rows: [], tr: new Map() };
  }
}

export default async function AdminHadis({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { rows, tr } = await search(q);
  const ids = rows.map((h) => h.id);
  // sanad semasa (Turso) sbg rujukan + override sedia ada (D1)
  const [isnads, overrides] = await Promise.all([getIsnadFor(ids), getSanadOverridesFor(ids)]);
  const chainText = (id: number): string => {
    const ov = overrides.get(id);
    const nodes = ov ?? isnads.get(id) ?? [];
    return nodes
      .filter((n) => n.chain_no === 0)
      .sort((a, b) => a.position - b.position)
      .map((n) => n.raw_name ?? "")
      .filter(Boolean)
      .join("\n");
  };

  return (
    <main>
      <h1 className="adm-h1">Hadis</h1>
      <p className="adm-sub">Edit matan, darjat, tajuk bab & terjemahan BM/EN — disimpan live ke D1.</p>

      <form className="adm-search" method="get">
        <input name="q" defaultValue={q} placeholder="Cari matan (Arab) atau No. ID…" autoFocus />
        <button className="btn solid" type="submit">Cari</button>
      </form>

      <p className="adm-count">{rows.length} hasil</p>
      {rows.map((h) => (
        <details className="adm-row" key={h.id}>
          <summary>
            <span className="adm-tag">#{h.id}</span>
            <span className="adm-row-ms">{h.title_ar || "—"}{h.number ? ` · no ${h.number}` : ""}</span>
            {h.grade && <span className="adm-tag">{h.grade}</span>}
          </summary>
          <form action={updateHadith} className="adm-grid">
            <input type="hidden" name="id" value={h.id} />
            <label className="adm-f"><span>Matan Arab *</span><textarea name="matn_ar" defaultValue={h.matn_ar ?? ""} rows={4} dir="rtl" /></label>
            <label className="adm-f"><span>Tajuk bab (Arab)</span><input name="chapter_ar" defaultValue={h.chapter_ar ?? ""} /></label>
            <label className="adm-f"><span>Darjat</span><input name="grade" defaultValue={h.grade ?? ""} placeholder="sahih / hasan / daif…" /></label>
            <label className="adm-f"><span>Terjemahan BM</span><textarea name="tr_ms" defaultValue={tr.get(`${h.id}:ms`) ?? ""} rows={3} /></label>
            <label className="adm-f"><span>Terjemahan EN</span><textarea name="tr_en" defaultValue={tr.get(`${h.id}:en`) ?? ""} rows={3} /></label>
            <div className="adm-actions"><button className="btn solid" type="submit">Simpan</button></div>
          </form>
          <form action={updateSanad} className="adm-grid" style={{ marginTop: "10px", borderTop: "1px solid var(--line-dark)", paddingTop: "12px" }}>
            <input type="hidden" name="id" value={h.id} />
            <label className="adm-f">
              <span>Betulkan Silsilat al-Isnad {overrides.has(h.id) ? "· (ada override)" : ""}</span>
              <textarea name="sanad_text" defaultValue={chainText(h.id)} rows={5} dir="rtl"
                placeholder="Satu perawi satu baris — dari atas (perawi kitab) ke bawah (sahabi/Nabi). Kosongkan utk kembali auto." />
            </label>
            <div className="adm-actions"><button className="btn solid" type="submit">Simpan sanad</button>
              <span className="adm-hint">Setiap baris dipadan ke profil perawi automatik. Simpan di D1 (tak sentuh graf pukal).</span>
            </div>
          </form>
        </details>
      ))}
      {rows.length === 0 && <p className="pempty">Tiada hasil.</p>}
    </main>
  );
}
