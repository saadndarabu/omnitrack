import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service-role client — bypasses RLS. Only use server-side for
// operations that have no authenticated user (e.g. webhook handlers).
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase admin env vars are missing")
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
