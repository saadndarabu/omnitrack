/**
 * Server-only Slack service.
 *
 * All functions here use the service-role Supabase client and call
 * the Slack API server-side. The bot_access_token is NEVER returned
 * to the frontend — it lives only in this module and the DB.
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { SIRP_WORKSPACE_ID } from "@/lib/slack/auth"

const SLACK_API = "https://slack.com/api"

export type SlackConnectionPublic = {
  connected:            true
  teamId:               string
  teamName:             string | null
  botUserId:            string | null
  defaultChannelId:     string | null
  defaultChannelName:   string | null
  approvalChannelId:    string | null
  approvalChannelName:  string | null
  connectedAt:          string
  connectedBy:          string | null
}

export type SlackChannel = {
  id:        string
  name:      string
  isPrivate: boolean
}

// ── Internal: fetch full connection row (service role, includes token) ──────

async function getConnectionRow(workspaceId: string) {
  const db = createSupabaseServiceRoleClient()
  const { data, error } = await db
    .from("slack_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (error) throw new Error(`[slack/service] DB read failed: ${error.message}`)
  return data
}

// ── Public: get connection metadata without token ────────────────────────────

export async function getSlackConnection(
  workspaceId: string = SIRP_WORKSPACE_ID
): Promise<SlackConnectionPublic | { connected: false }> {
  const row = await getConnectionRow(workspaceId)
  if (!row) return { connected: false }

  return {
    connected:           true,
    teamId:              row.slack_team_id,
    teamName:            row.slack_team_name,
    botUserId:           row.bot_user_id,
    defaultChannelId:    row.default_channel_id,
    defaultChannelName:  row.default_channel_name,
    approvalChannelId:   row.approval_channel_id,
    approvalChannelName: row.approval_channel_name,
    connectedAt:         row.connected_at,
    connectedBy:         row.connected_by,
  }
}

// ── Internal: call Slack API with the stored bot token ───────────────────────

async function slackApiCall<T = unknown>(
  endpoint: string,
  workspaceId: string,
  options: RequestInit = {}
): Promise<T> {
  const row = await getConnectionRow(workspaceId)
  if (!row) throw new Error("Slack is not connected for this workspace")

  const res = await fetch(`${SLACK_API}/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${row.bot_access_token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    throw new Error(`Slack API HTTP error: ${res.status}`)
  }

  const json = await res.json() as { ok: boolean; error?: string } & T
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error ?? "unknown"}`)
  }

  return json
}

// ── List channels ─────────────────────────────────────────────────────────────

export async function listSlackChannels(
  workspaceId: string = SIRP_WORKSPACE_ID
): Promise<SlackChannel[]> {
  const params = new URLSearchParams({
    types:            "public_channel,private_channel",
    exclude_archived: "true",
    limit:            "200",
  })

  const json = await slackApiCall<{
    channels: Array<{ id: string; name: string; is_private: boolean }>
  }>(`conversations.list?${params}`, workspaceId)

  return (json.channels ?? []).map(ch => ({
    id:        ch.id,
    name:      ch.name,
    isPrivate: ch.is_private,
  }))
}

// ── Send a message ────────────────────────────────────────────────────────────

export async function sendSlackMessage({
  workspaceId = SIRP_WORKSPACE_ID,
  channelId,
  text,
  blocks,
}: {
  workspaceId?: string
  channelId:    string
  text:         string
  blocks?:      unknown[]
}): Promise<void> {
  await slackApiCall("chat.postMessage", workspaceId, {
    method: "POST",
    body: JSON.stringify({ channel: channelId, text, ...(blocks ? { blocks } : {}) }),
  })
}

// ── Upsert connection (used by OAuth callback) ────────────────────────────────

export async function upsertSlackConnection(params: {
  workspaceId:      string
  slackTeamId:      string
  slackTeamName:    string | null
  botUserId:        string | null
  botAccessToken:   string
  connectedBy:      string | null
}): Promise<void> {
  const db = createSupabaseServiceRoleClient()

  const { error } = await db
    .from("slack_connections")
    .upsert(
      {
        workspace_id:      params.workspaceId,
        slack_team_id:     params.slackTeamId,
        slack_team_name:   params.slackTeamName,
        bot_user_id:       params.botUserId,
        bot_access_token:  params.botAccessToken,
        connected_by:      params.connectedBy,
        connected_at:      new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      },
      { onConflict: "workspace_id,slack_team_id" }
    )

  if (error) throw new Error(`[slack/service] upsert failed: ${error.message}`)
}

// ── Update channel settings ───────────────────────────────────────────────────

export async function updateSlackChannelSettings(params: {
  workspaceId:          string
  defaultChannelId:     string | null
  defaultChannelName:   string | null
  approvalChannelId:    string | null
  approvalChannelName:  string | null
}): Promise<void> {
  const db = createSupabaseServiceRoleClient()

  const { error } = await db
    .from("slack_connections")
    .update({
      default_channel_id:    params.defaultChannelId,
      default_channel_name:  params.defaultChannelName,
      approval_channel_id:   params.approvalChannelId,
      approval_channel_name: params.approvalChannelName,
      updated_at:            new Date().toISOString(),
    })
    .eq("workspace_id", params.workspaceId)

  if (error) throw new Error(`[slack/service] settings update failed: ${error.message}`)
}
