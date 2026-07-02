import { supabaseAdmin } from "@/lib/supabase";
import { reviewSuggestion } from "@/app/actions";

export const dynamic = "force-dynamic";

// Dilindungi oleh middleware (sesi GitHub). Peti masuk cadangan awam.
export default async function AdminCadangan() {
  const { data: pending } = await supabaseAdmin
    .from("correction_suggestions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = pending ?? [];

  return (
    <main>
      <h1 className="adm-h1">Cadangan Pembetulan</h1>
      <p style={{ color: "var(--muted)", marginBottom: "24px" }}>{rows.length} cadangan menunggu semakan.</p>

      {rows.length === 0 && <p className="pempty">Tiada cadangan menunggu.</p>}

      {rows.map((s) => (
        <article className="adm-card" key={s.id}>
          <div className="adm-meta">
            <span className="adm-tag">{s.entity_type} #{s.entity_id}</span>
            {s.field && <span className="adm-tag">{s.field}</span>}
            {s.lang && <span className="adm-tag">{s.lang}</span>}
            <span className="adm-date">{new Date(s.created_at).toLocaleString("ms-MY")}</span>
          </div>
          {s.current_text && (
            <div className="adm-block">
              <div className="adm-lbl">Semasa</div>
              <div className="adm-text ar">{s.current_text}</div>
            </div>
          )}
          <div className="adm-block">
            <div className="adm-lbl">Dicadang</div>
            <div className="adm-text ar" style={{ color: "var(--gold-soft)" }}>{s.suggested_text}</div>
          </div>
          {s.reason && <p className="adm-reason">Sebab: {s.reason}</p>}
          {s.submitter && <p className="adm-reason">Oleh: {s.submitter}</p>}
          <div className="adm-actions">
            <form action={reviewSuggestion}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="decision" value="approved" />
              <button className="btn solid" type="submit">Lulus</button>
            </form>
            <form action={reviewSuggestion}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="decision" value="rejected" />
              <button className="btn ghost" type="submit">Tolak</button>
            </form>
          </div>
        </article>
      ))}
    </main>
  );
}
