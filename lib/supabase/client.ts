import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing")
  }

  return { anonKey, url }
}

export function createSupabaseBrowserClient() {
  const { anonKey, url } = getSupabaseConfig()
  return createBrowserClient<Database>(url, anonKey)
}
