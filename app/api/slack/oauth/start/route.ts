/**
 * GET /api/slack/oauth/start
 *
 * Initiates Slack OAuth v2. Admin only.
 * Generates a random state, stores it in an httpOnly cookie,
 * then redirects to Slack's OAuth authorize URL.
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SLACK_SCOPES = [
  "chat:write",
  "channels:read",
  "groups:read",
  "users:read",
  "users:read.email",
].join(",")

export async function GET(request: Request) {
  try {
    await requireAdminWorkspace()
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }

  const clientId   = process.env.SLACK_CLIENT_ID
  const redirectUri = process.env.SLACK_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error("[slack/oauth/start] Missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI")
    return NextResponse.json({ error: "Slack integration not configured" }, { status: 500 })
  }

  // Cryptographically random state to prevent CSRF
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set("slack_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600, // 10 minutes
    path:     "/",
  })

  const params = new URLSearchParams({
    client_id:    clientId,
    scope:        SLACK_SCOPES,
    redirect_uri: redirectUri,
    state,
  })

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?${params}`

  return NextResponse.redirect(slackAuthUrl)
}
