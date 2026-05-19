/**
 * GET /api/slack/channels
 *
 * Lists channels accessible to the Slack bot for this workspace.
 * Admin only. Uses the stored bot token server-side — never exposes it.
 */

import { NextResponse } from "next/server"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"
import { listSlackChannels } from "@/lib/slack/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { workspaceId } = await requireAdminWorkspace()
    const channels = await listSlackChannels(workspaceId)
    return NextResponse.json(channels)
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : "Failed to fetch channels"
    console.error("[GET /api/slack/channels]", err)
    // Surface Slack "not_in_channel" or connectivity errors clearly
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
