import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { githubAuthorizeUrl } from "@/lib/github/oauth"

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Encode user ID in state so the callback can associate the token
  const state = Buffer.from(user.id).toString("base64url")
  return NextResponse.redirect(githubAuthorizeUrl(state))
}
