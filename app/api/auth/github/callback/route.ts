import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { exchangeCodeForToken, getGithubUser } from "@/lib/github/oauth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/settings/github?error=oauth", request.url))
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verify state matches the current user
  const expectedState = Buffer.from(user.id).toString("base64url")
  if (state !== expectedState) {
    return NextResponse.redirect(new URL("/settings/github?error=state", request.url))
  }

  try {
    const token = await exchangeCodeForToken(code)
    const githubUser = await getGithubUser(token)

    await supabase.from("github_user_connections").upsert({
      user_id: user.id,
      github_login: githubUser.login,
      github_user_id: githubUser.id,
      access_token: token,
      token_scopes: ["repo"]
    })

    return NextResponse.redirect(new URL("/settings/github?connected=1", request.url))
  } catch {
    return NextResponse.redirect(new URL("/settings/github?error=token", request.url))
  }
}
