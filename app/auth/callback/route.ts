import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url))
    }

    if (!data.user.email?.endsWith("@sirp.io")) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?error=domain", request.url))
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url))
}
