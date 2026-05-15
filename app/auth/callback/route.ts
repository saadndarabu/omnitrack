import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code       = requestUrl.searchParams.get("code")
  const oauthError = requestUrl.searchParams.get("error")
  const next       = requestUrl.searchParams.get("next") ?? "/dashboard"

  if (oauthError) {
    console.error("[auth/callback] OAuth error:", oauthError, requestUrl.searchParams.get("error_description"))
    return NextResponse.redirect(new URL("/login?error=oauth", request.url))
  }

  if (!code) {
    console.error("[auth/callback] No code in callback URL")
    return NextResponse.redirect(new URL("/login?error=oauth", request.url))
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message)
    return NextResponse.redirect(new URL("/login?error=oauth", request.url))
  }

  // Enforce @sirp.io domain for Google sign-in (primary login flow only).
  // GitHub is only used as a linked identity, not a primary provider.
  const primaryProvider = data.user.app_metadata?.provider as string | undefined
  if (primaryProvider === "google" && !data.user.email?.endsWith("@sirp.io")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login?error=domain", request.url))
  }

  // GitHub identity data is written client-side in ConnectorsShell after redirect,
  // where the session is fully hydrated. The `next` and `link` params are preserved
  // in the redirect URL for the shell to consume.
  const safeNext = next.startsWith("/") ? next : "/dashboard"
  const redirectUrl = new URL(safeNext, request.url)

  // Forward link param so ConnectorsShell knows to sync GitHub identity
  const link = requestUrl.searchParams.get("link")
  if (link) redirectUrl.searchParams.set("link", link)

  return NextResponse.redirect(redirectUrl)
}
