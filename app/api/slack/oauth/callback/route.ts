/**
 * GET /api/slack/oauth/callback
 *
 * Slack redirects here after the user approves the app.
 * Validates state, exchanges code for a bot token, and upserts
 * a workspace-level slack_connections row.
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"
import { upsertSlackConnection } from "@/lib/slack/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CONNECTORS_PATH = "/connectors"

function redirectError(base: string, reason: string) {
  return NextResponse.redirect(new URL(`${CONNECTORS_PATH}?slack=error&reason=${encodeURIComponent(reason)}`, base))
}

export async function GET(request: Request) {
  const url    = new URL(request.url)
  const code   = url.searchParams.get("code")
  const state  = url.searchParams.get("state")
  const slackError = url.searchParams.get("error")

  // User denied on Slack side
  if (slackError) {
    console.warn("[slack/oauth/callback] Slack returned error:", slackError)
    return redirectError(request.url, slackError)
  }

  if (!code || !state) {
    return redirectError(request.url, "missing_params")
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState  = cookieStore.get("slack_oauth_state")?.value
  cookieStore.set("slack_oauth_state", "", { maxAge: 0, path: "/" }) // consume it

  if (!savedState || savedState !== state) {
    console.warn("[slack/oauth/callback] State mismatch — possible CSRF")
    return redirectError(request.url, "invalid_state")
  }

  // Re-verify admin (the user returning from Slack must still be an admin)
  let adminCtx: Awaited<ReturnType<typeof requireAdminWorkspace>>
  try {
    adminCtx = await requireAdminWorkspace()
  } catch (err) {
    if (err instanceof UnauthenticatedError) return redirectError(request.url, "unauthenticated")
    if (err instanceof UnauthorizedError)   return redirectError(request.url, "unauthorized")
    return redirectError(request.url, "server_error")
  }

  const clientId     = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const redirectUri  = process.env.SLACK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[slack/oauth/callback] Missing Slack env vars")
    return redirectError(request.url, "misconfigured")
  }

  // Exchange code → bot token
  let slackData: {
    ok:           boolean
    error?:       string
    team?:        { id: string; name: string }
    bot_user_id?: string
    access_token?: string
    authed_user?: { id: string }
  }

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    })
    slackData = await tokenRes.json()
  } catch (err) {
    console.error("[slack/oauth/callback] Token exchange fetch failed:", err)
    return redirectError(request.url, "token_exchange_failed")
  }

  if (!slackData.ok) {
    console.warn("[slack/oauth/callback] Slack token exchange not ok:", slackData.error)
    return redirectError(request.url, slackData.error ?? "slack_error")
  }

  if (!slackData.access_token) {
    console.error("[slack/oauth/callback] No access_token in Slack response")
    return redirectError(request.url, "no_token")
  }

  try {
    await upsertSlackConnection({
      workspaceId:    adminCtx.workspaceId,
      slackTeamId:    slackData.team?.id ?? "",
      slackTeamName:  slackData.team?.name ?? null,
      botUserId:      slackData.bot_user_id ?? null,
      botAccessToken: slackData.access_token,
      connectedBy:    adminCtx.userId,
    })
  } catch (err) {
    console.error("[slack/oauth/callback] DB upsert failed:", err)
    return redirectError(request.url, "db_error")
  }

  console.info(
    `[slack/oauth/callback] Slack connected — workspace=${adminCtx.workspaceId} team=${slackData.team?.id} by=${adminCtx.userId}`
  )

  return NextResponse.redirect(new URL(`${CONNECTORS_PATH}?slack=connected`, request.url))
}
