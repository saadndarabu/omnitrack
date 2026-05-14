"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function signInWithGoogle() {
  try {
    const headerStore = await headers()
    const origin = "https://omnitrack-ten.vercel.app"
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`
      }
    })

    if (error || !data.url) {
      redirect("/login?error=oauth")
    }

    redirect(data.url)
  } catch (e) {
    if (isRedirectError(e)) throw e
    redirect("/login?error=config")
  }
}
