/**
 * GET /api/slack/status
 *
 * Returns the Slack connection status for the current workspace.
 * Admin only. Never returns bot_access_token.
 */

import { NextResponse } from "next/server"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"
import { getSlackConnection } from "@/lib/slack/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { workspaceId } = await requireAdminWorkspace()
    const status = await getSlackConnection(workspaceId)
    return NextResponse.json(status)
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("[GET /api/slack/status]", err)
    return NextResponse.json({ error: "Failed to fetch Slack status" }, { status: 500 })
  }
}
