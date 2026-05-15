import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbConnectGitHub } from "@/lib/db/users"

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

  // Google sign-in: enforce @sirp.io domain
  const provider = data.user.app_metadata?.provider as string | undefined
  if (provider === "google" && !data.user.email?.endsWith("@sirp.io")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login?error=domain", request.url))
  }

  // GitHub link: store GitHub identity against the user's profile
  if (provider === "github") {
    const identity = data.user.identities?.find(i => i.provider === "github")
    const githubUsername = (identity?.identity_data?.["user_name"] as string | undefined)
      ?? (identity?.identity_data?.["preferred_username"] as string | undefined)
      ?? ""
    const githubEmail = (identity?.identity_data?.["email"] as string | undefined) ?? ""

    if (githubUsername) {
      try {
        await dbConnectGitHub(supabase, data.user.id, githubUsername, githubEmail)
      } catch (err) {
        console.error("[auth/callback] Failed to store GitHub identity:", err)
        // Non-fatal: user is still authenticated, just won't see GitHub linked
      }
    }
  }

  // Validate `next` to prevent open redirect
  const safeNext = next.startsWith("/") ? next : "/dashboard"
  return NextResponse.redirect(new URL(safeNext, request.url))
}
