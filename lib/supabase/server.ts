import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Relaxed schema generic — matches the shape lib/db/* expects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerClient = SupabaseClient<Database, any, any>

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing")
  }

  return { anonKey, url }
}

export async function createSupabaseServerClient(): Promise<ServerClient> {
  const { anonKey, url } = getSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Server Components cannot mutate cookies; Server Actions and routes can.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch {
          // Server Components cannot mutate cookies; Server Actions and routes can.
        }
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any as ServerClient
}
