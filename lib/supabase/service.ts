/**
 * Service-role Supabase client.
 *
 * Server-only. Bypasses RLS. Used by GitHub App webhook + sync
 * routes, where we receive system events with no user session
 * and must still write integration records.
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured — fail
 * loudly rather than silently writing nothing.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceClient = SupabaseClient<Database, any, any>

export function createSupabaseServiceRoleClient(): ServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any as ServiceClient
}
