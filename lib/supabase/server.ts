import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing")
  }

  return { anonKey, url }
}

export async function createSupabaseServerClient() {
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
  })
}
