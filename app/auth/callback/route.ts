import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbConnectGitHub } from "@/lib/db/users"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code       = requestUrl.searchParams.get("code")
  const oauthError = requestUrl.searchParams.get("error")
  const next       = requestUrl.searchParams.get("next") ?? "/dashboard"

  // identity_already_exists means the GitHub account is already linked in Supabase
  // auth but the DB row may not reflect it. Recover by reading the current session
  // and syncing whatever GitHub identity is already there.
  const errorCode = requestUrl.searchParams.get("error_code")
  if (oauthError && errorCode === "identity_already_exists") {
    const safeNext = next.startsWith("/") ? next : "/dashboard"
    const supabase = await createSupabaseServerClient()
    const { data: { user: sessionUser } } = await supabase.auth.getUser()
    if (sessionUser) {
      const githubIdentity = sessionUser.identities?.find(i => i.provider === "github")
      if (githubIdentity) {
        const d = githubIdentity.identity_data ?? {}
        const githubUsername =
          (d["user_name"]          as string | undefined) ??
          (d["preferred_username"] as string | undefined) ??
          (d["login"]              as string | undefined) ??
          ""
        const githubEmail = (d["email"] as string | undefined) ?? ""
        if (githubUsername) {
          try {
            await dbConnectGitHub(supabase, sessionUser.id, githubUsername, githubEmail)
          } catch (dbErr) {
            console.error("[auth/callback] GitHub DB sync (identity_already_exists) failed:", dbErr)
          }
        }
      }
    }
    return NextResponse.redirect(new URL(safeNext, request.url))
  }

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

  // If a GitHub identity was just linked, sync it to the DB row immediately.
  // This is the single point all OAuth returns pass through, so the connector
  // page can simply read the DB row — no client-side retry needed.
  const githubIdentity = data.user.identities?.find(i => i.provider === "github")
  if (githubIdentity) {
    const d = githubIdentity.identity_data ?? {}
    const githubUsername =
      (d["user_name"]         as string | undefined) ??
      (d["preferred_username"] as string | undefined) ??
      (d["login"]             as string | undefined) ??
      ""
    const githubEmail = (d["email"] as string | undefined) ?? ""
    if (githubUsername) {
      try {
        await dbConnectGitHub(supabase, data.user.id, githubUsername, githubEmail)
      } catch (dbErr) {
        console.error("[auth/callback] GitHub DB sync failed:", dbErr)
        // Non-fatal — user lands on connectors page and can retry
      }
    }
  }

  const safeNext = next.startsWith("/") ? next : "/dashboard"
  return NextResponse.redirect(new URL(safeNext, request.url))
}
