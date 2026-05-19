/**
 * POST /api/slack/test-message
 *
 * Sends a test message to the specified channel.
 * Admin only. Uses the stored bot token server-side.
 */

import { NextResponse } from "next/server"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"
import { sendSlackMessage } from "@/lib/slack/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAdminWorkspace()

    const body = await request.json() as { channelId?: string }
    if (!body.channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 })
    }

    await sendSlackMessage({
      workspaceId,
      channelId: body.channelId,
      text: "Omnitrack is now connected to Slack. Engineering notifications are ready.",
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : "Failed to send message"
    console.error("[POST /api/slack/test-message]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
