import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase admin (service/secret key) — SERVER SAHAJA.
 * Guna utk simpan cadangan & papan admin (bypass RLS). Jangan import dari komponen klien.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
