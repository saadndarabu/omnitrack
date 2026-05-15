import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbConnectGitHub } from "@/lib/db/users"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code       = requestUrl.searchParams.get("code")
  const oauthError = requestUrl.searchParams.get("error")
  const next       = requestUrl.searchParams.get("next") ?? "/dashboard"
  const link       = requestUrl.searchParams.get("link") // "github" when coming from linkIdentity

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

  const primaryProvider = data.user.app_metadata?.provider as string | undefined

  // Google sign-in: enforce @sirp.io domain
  if (primaryProvider === "google" && !link && !data.user.email?.endsWith("@sirp.io")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login?error=domain", request.url))
  }

  // GitHub identity link: extract and store GitHub username + email.
  // This fires both for linkIdentity (link=github) and for direct GitHub sign-in.
  const isGitHubLink = link === "github" || primaryProvider === "github"
  if (isGitHubLink) {
    const githubIdentity = data.user.identities?.find(i => i.provider === "github")
    const identityData   = githubIdentity?.identity_data ?? {}

    const githubUsername =
      (identityData["user_name"]           as string | undefined) ??
      (identityData["preferred_username"]   as string | undefined) ??
      (identityData["login"]                as string | undefined) ??
      ""
    const githubEmail =
      (identityData["email"] as string | undefined) ?? ""

    if (githubUsername) {
      try {
        await dbConnectGitHub(supabase, data.user.id, githubUsername, githubEmail)
      } catch (err) {
        console.error("[auth/callback] Failed to store GitHub identity:", err)
        // Non-fatal — user lands on /connectors where they can retry
      }
    } else {
      console.warn("[auth/callback] GitHub identity present but no username found", identityData)
    }
  }

  const safeNext = next.startsWith("/") ? next : "/dashboard"
  return NextResponse.redirect(new URL(safeNext, request.url))
}
