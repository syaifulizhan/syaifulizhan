import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase admin (service/secret key) — SERVER SAHAJA, dicipta LAZY.
 * Env Cloudflare (SUPABASE_SECRET_KEY) hanya tersedia masa request, bukan module-load.
 */
let _client: SupabaseClient | undefined;

function client(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = client();
    const v = Reflect.get(c as object, prop);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
