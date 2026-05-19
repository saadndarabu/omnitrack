/**
 * PATCH /api/slack/settings
 *
 * Updates default and approval channel config for the workspace
 * Slack connection. Admin only.
 */

import { NextResponse } from "next/server"
import { requireAdminWorkspace, UnauthenticatedError, UnauthorizedError } from "@/lib/slack/auth"
import { getSlackConnection, updateSlackChannelSettings } from "@/lib/slack/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SettingsBody = {
  defaultChannelId?:    string | null
  defaultChannelName?:  string | null
  approvalChannelId?:   string | null
  approvalChannelName?: string | null
}

export async function PATCH(request: Request) {
  try {
    const { workspaceId } = await requireAdminWorkspace()

    // Verify Slack is already connected
    const status = await getSlackConnection(workspaceId)
    if (!status.connected) {
      return NextResponse.json({ error: "Slack is not connected" }, { status: 404 })
    }

    const body = await request.json() as SettingsBody

    await updateSlackChannelSettings({
      workspaceId,
      defaultChannelId:    body.defaultChannelId   ?? null,
      defaultChannelName:  body.defaultChannelName ?? null,
      approvalChannelId:   body.approvalChannelId  ?? null,
      approvalChannelName: body.approvalChannelName ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error("[PATCH /api/slack/settings]", err)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
