"use server";
import { supabaseAdmin } from "@/lib/supabase";
import { hadithDb, corpus } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";
import { verifySession, SESSION_COOKIE, type AdminSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/** Pastikan pemanggil ialah admin bersesi sah (server action boleh dipanggil terus). */
async function requireAdmin(): Promise<AdminSession> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) throw new Error("Tidak dibenarkan");
  return session;
}

const s = (fd: FormData, k: string): string => String(fd.get(k) ?? "").trim();
const orNull = (v: string): string | null => (v ? v : null);

function hurufOf(termAr: string): string {
  const n = normalizeArabic(termAr).replace(/^ال/, "").replace(/^[«»"'()\s]+/, "");
  return n[0] || "";
}

// ── GLOSARI (D1, live) ─────────────────────────────────────────────
export async function updateGlossary(formData: FormData) {
  await requireAdmin();
  const rowid = Number(formData.get("rowid"));
  const term_ar = s(formData, "term_ar");
  if (!Number.isFinite(rowid) || !term_ar) return;
  await hadithDb.execute({
    sql: `UPDATE glossary SET term_ar=?, term_search=?, huruf=?, translit=?, term_ms=?, term_en=?, def_ar=?, def_ms=?, def_en=? WHERE rowid=?`,
    args: [
      term_ar, normalizeArabic(term_ar), hurufOf(term_ar),
      orNull(s(formData, "translit")), orNull(s(formData, "term_ms")), orNull(s(formData, "term_en")),
      orNull(s(formData, "def_ar")), orNull(s(formData, "def_ms")), orNull(s(formData, "def_en")), rowid,
    ],
  });
  revalidatePath("/admin/glosari");
}

export async function addGlossary(formData: FormData) {
  await requireAdmin();
  const term_ar = s(formData, "term_ar");
  if (!term_ar) return;
  await hadithDb.execute({
    sql: `INSERT INTO glossary (term_ar, term_search, huruf, translit, term_ms, term_en, def_ar, def_ms, def_en, source)
          VALUES (?,?,?,?,?,?,?,?,?, 'admin')`,
    args: [
      term_ar, normalizeArabic(term_ar), hurufOf(term_ar),
      orNull(s(formData, "translit")), orNull(s(formData, "term_ms")), orNull(s(formData, "term_en")),
      orNull(s(formData, "def_ar")), orNull(s(formData, "def_ms")), orNull(s(formData, "def_en")),
    ],
  });
  revalidatePath("/admin/glosari");
}

export async function deleteGlossary(formData: FormData) {
  await requireAdmin();
  const rowid = Number(formData.get("rowid"));
  if (!Number.isFinite(rowid)) return;
  await hadithDb.execute({ sql: "DELETE FROM glossary WHERE rowid=?", args: [rowid] });
  revalidatePath("/admin/glosari");
}

// ── HADIS (D1, live) ───────────────────────────────────────────────
export async function updateHadith(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const matn_ar = s(formData, "matn_ar");
  if (!Number.isFinite(id) || !matn_ar) return;
  await hadithDb.execute({
    sql: "UPDATE hadiths SET matn_ar=?, matn_search=?, grade=?, chapter_ar=? WHERE id=?",
    args: [matn_ar, normalizeArabic(matn_ar), orNull(s(formData, "grade")), orNull(s(formData, "chapter_ar")), id],
  });
  // Terjemahan BM/EN (jadual translations, entity_type='hadith')
  for (const lang of ["ms", "en"] as const) {
    const text = s(formData, `tr_${lang}`);
    await hadithDb.execute({ sql: "DELETE FROM translations WHERE entity_type='hadith' AND entity_id=? AND lang=?", args: [id, lang] });
    if (text) {
      await hadithDb.execute({
        sql: "INSERT INTO translations (entity_type, entity_id, lang, text, source, is_verified) VALUES ('hadith',?,?,?, 'admin', 1)",
        args: [id, lang, text],
      });
    }
  }
  revalidatePath("/admin/hadis");
}

// ── BETULKAN SANAD (override D1; elak re-parse/re-sync Turso pukal) ──
// Admin taip sanad betul (satu perawi satu baris, dari atas kitab → sahabi/Nabi).
// Setiap nama dipadan ke perawi korpus (Turso, sekali masa simpan) → simpan JSON di
// D1. Isnad papar override ini ganti hasil parser. Kosong = padam override (balik auto).
export async function updateSanad(formData: FormData) {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const raw = s(formData, "sanad_text");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    await hadithDb.execute({ sql: "DELETE FROM hadith_sanad_override WHERE hadith_id=?", args: [id] });
    revalidatePath("/admin/hadis");
    return;
  }
  // Padan nama → perawi secara BATCH (1-2 query Turso, bukan N) — elak CF Worker timeout/
  // had subrequest yg menyebabkan "server error" dulu. Turso down → simpan nama sahaja.
  const norms = lines.map((l) => normalizeArabic(l));
  const resolved = new Map<string, { id: number; name: string }>();
  try {
    // (1) padanan TEPAT-unik untuk semua nama sekali gus
    const ph = norms.map(() => "?").join(",");
    const r = await corpus.execute({ sql: `SELECT id, name_ar, name_search FROM narrators WHERE name_search IN (${ph})`, args: norms });
    const cnt = new Map<string, number>();
    for (const row of r.rows) cnt.set(String(row.name_search), (cnt.get(String(row.name_search)) ?? 0) + 1);
    for (const row of r.rows) { const k = String(row.name_search); if (cnt.get(k) === 1) resolved.set(k, { id: Number(row.id), name: String(row.name_ar ?? "") }); }
    // (2) awalan ber-بن unik untuk nama yg belum padan (1 query LIKE-OR) — kes المهمل
    const pend = [...new Set(norms.filter((n) => !resolved.has(n) && n.includes(" بن ")))].slice(0, 30);
    if (pend.length) {
      const like = pend.map(() => "name_search LIKE ? || ' %'").join(" OR ");
      const r2 = await corpus.execute({ sql: `SELECT id, name_ar, name_search FROM narrators WHERE ${like}`, args: pend });
      for (const n of pend) {
        const hits = (r2.rows as unknown as { id: number; name_ar: string; name_search: string }[]).filter((x) => String(x.name_search).startsWith(n + " "));
        if (hits.length === 1) resolved.set(n, { id: Number(hits[0].id), name: String(hits[0].name_ar ?? "") });
      }
    }
  } catch { /* Turso down/kuota → simpan nama sahaja, JANGAN crash */ }
  const nodes = lines.map((line, i) => {
    const m = resolved.get(norms[i]);
    return { narrator_id: m?.id ?? null, chain_no: 0, position: i, raw_name: line, resolved: m?.name ?? null };
  });
  try {
    await hadithDb.execute({
      sql: `INSERT INTO hadith_sanad_override (hadith_id, nodes_json, edited_by, edited_at)
            VALUES (?,?,?,?) ON CONFLICT(hadith_id) DO UPDATE SET nodes_json=excluded.nodes_json, edited_by=excluded.edited_by, edited_at=excluded.edited_at`,
      args: [id, JSON.stringify(nodes), session.login ?? "admin", new Date().toISOString()],
    });
  } catch (e) {
    console.error("updateSanad D1 INSERT gagal:", e);
    throw new Error("Gagal simpan sanad — cuba lagi");
  }
  revalidatePath("/admin/hadis");
}

// ── PERAWI (Turso — live bila kuota reset) ─────────────────────────
export async function updateNarrator(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name_ar = s(formData, "name_ar");
  if (!Number.isFinite(id) || !name_ar) return;
  const dy = s(formData, "death_year");
  await corpus.execute({
    sql: `UPDATE narrators SET name_ar=?, shuhra=?, kunya=?, nisba=?, rutbah=?, profession=?, death_year=?, death_place=?, bio_ar=? WHERE id=?`,
    args: [
      name_ar, orNull(s(formData, "shuhra")), orNull(s(formData, "kunya")), orNull(s(formData, "nisba")),
      orNull(s(formData, "rutbah")), orNull(s(formData, "profession")),
      dy ? Number(dy) : null, orNull(s(formData, "death_place")), orNull(s(formData, "bio_ar")), id,
    ],
  });
  revalidatePath("/admin/perawi");
}

// ── CADANGAN PEMBETULAN ────────────────────────────────────────────
/** Pengguna hantar cadangan (AWAM — tiada perlu log masuk). */
export async function submitSuggestion(formData: FormData) {
  const suggested = s(formData, "suggested_text");
  const entityId = Number(formData.get("entity_id"));
  if (!suggested || !Number.isFinite(entityId)) return { ok: false };
  const { error } = await supabaseAdmin.from("correction_suggestions").insert({
    entity_type: s(formData, "entity_type") || "hadith",
    entity_id: entityId,
    lang: orNull(s(formData, "lang")),
    field: orNull(s(formData, "field")),
    current_text: orNull(s(formData, "current_text")),
    suggested_text: suggested,
    reason: orNull(s(formData, "reason")),
    submitter: orNull(s(formData, "submitter")),
  });
  return { ok: !error, error: error?.message };
}

/** Admin lulus/tolak cadangan. */
export async function reviewSuggestion(formData: FormData) {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (!Number.isFinite(id) || !["approved", "rejected"].includes(decision)) return;
  await supabaseAdmin
    .from("correction_suggestions")
    .update({ status: decision, reviewed_at: new Date().toISOString(), reviewer: session.login })
    .eq("id", id);
  revalidatePath("/admin/cadangan");
}
