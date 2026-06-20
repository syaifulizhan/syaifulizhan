"use server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

/** Pengguna hantar cadangan pembetulan (status 'pending'). */
export async function submitSuggestion(formData: FormData) {
  const suggested = String(formData.get("suggested_text") || "").trim();
  const entityId = Number(formData.get("entity_id"));
  if (!suggested || !Number.isFinite(entityId)) return { ok: false };

  const { error } = await supabaseAdmin.from("correction_suggestions").insert({
    entity_type: String(formData.get("entity_type") || "hadith"),
    entity_id: entityId,
    lang: (formData.get("lang") as string) || null,
    field: (formData.get("field") as string) || null,
    current_text: (formData.get("current_text") as string) || null,
    suggested_text: suggested,
    reason: (formData.get("reason") as string) || null,
    submitter: (formData.get("submitter") as string) || null,
  });
  return { ok: !error, error: error?.message };
}

/** Admin lulus/tolak cadangan. */
export async function reviewSuggestion(formData: FormData) {
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (!Number.isFinite(id) || !["approved", "rejected"].includes(decision)) return;
  await supabaseAdmin
    .from("correction_suggestions")
    .update({ status: decision, reviewed_at: new Date().toISOString(), reviewer: "admin" })
    .eq("id", id);
  revalidatePath("/admin/cadangan");
}
