/**
 * GitHub App webhook receiver.
 *
 * • Reads the raw body and verifies the HMAC-SHA-256 signature
 *   against GITHUB_WEBHOOK_SECRET BEFORE parsing JSON.
 * • Records every (delivery_id, event) into github_webhook_events.
 * • Dispatches: installation, installation_repositories,
 *   repository, pull_request, push.
 * • Returns 401 only for invalid signatures. Processing errors
 *   are captured into the event row and the response stays 200
 *   so GitHub does not infinitely retry.
 */

import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import {
  verifyGitHubWebhookSignature,
  getGitHubWebhookHeaders,
  type GitHubEventPayload
} from "@/lib/github/webhooks"
import {
  upsertInstallation,
  upsertRepositories,
  disableRepositories,
  setInstallationSuspended,
  deleteInstallation,
  syncInstallationRepositories
} from "@/lib/github/installations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const { event, delivery, signature } = getGitHubWebhookHeaders(request.headers)

  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error("[github/webhook] GITHUB_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  if (!verifyGitHubWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (!event || !delivery) {
    return NextResponse.json({ error: "Missing required webhook headers" }, { status: 400 })
  }

  let payload: GitHubEventPayload
  try {
    payload = JSON.parse(rawBody) as GitHubEventPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const db = createSupabaseServiceRoleClient()

  // Insert the raw event first so we have an audit trail even if
  // processing fails. `delivery_id` is unique — duplicates from
  // GitHub retries are no-ops.
  const { error: insertErr } = await db
    .from("github_webhook_events")
    .insert({
      delivery_id:     delivery,
      event_type:      event,
      action:          payload.action ?? null,
      installation_id: payload.installation?.id ?? null,
      github_repo_id:  payload.repository?.id ?? null,
      repo_full_name:  payload.repository?.full_name ?? null,
      payload:         payload as unknown as Record<string, unknown>,
      processed:       false
    })

  if (insertErr && !insertErr.message.toLowerCase().includes("duplicate")) {
    console.error("[github/webhook] failed to record event", insertErr)
    // Still attempt processing — best effort.
  }

  try {
    await dispatch(db, event, payload)

    await db
      .from("github_webhook_events")
      .update({ processed: true })
      .eq("delivery_id", delivery)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[github/webhook] processing failed for ${event}.${payload.action ?? ""}`, message)
    await db
      .from("github_webhook_events")
      .update({ processed: false, error: message })
      .eq("delivery_id", delivery)
    // Still return 200 so GitHub does not retry indefinitely;
    // the failure is recorded for replay/debug.
  }

  return NextResponse.json({ ok: true })
}

// ── Dispatcher ───────────────────────────────────────────────

type Db = ReturnType<typeof createSupabaseServiceRoleClient>

async function dispatch(db: Db, event: string, payload: GitHubEventPayload) {
  switch (event) {
    case "installation":
      return handleInstallation(db, payload)
    case "installation_repositories":
      return handleInstallationRepositories(db, payload)
    case "repository":
      return handleRepository(db, payload)
    case "pull_request":
      return handlePullRequest(db, payload)
    case "push":
      // TODO: hook push events into ticket activity timeline.
      return
    default:
      // Unhandled event types are still recorded above — no-op here.
      return
  }
}

// ── Handlers ─────────────────────────────────────────────────

async function handleInstallation(db: Db, payload: GitHubEventPayload) {
  const installationId = payload.installation?.id
  if (!installationId) return

  const action = payload.action
  const account = payload.installation?.account

  switch (action) {
    case "created": {
      await upsertInstallation(db, {
        installationId,
        accountLogin:        account?.login ?? null,
        accountId:           account?.id ?? null,
        accountType:         account?.type ?? null,
        repositorySelection: payload.installation?.repository_selection ?? null,
        appSlug:             payload.installation?.app_slug ?? null,
        suspendedAt:         null
      })

      // Initial sync — payload.repositories may exist but call the
      // API to get full metadata (default_branch, etc).
      try {
        await syncInstallationRepositories(db, installationId)
      } catch (err) {
        console.error("[github/webhook] initial repo sync failed", err)
        // Non-fatal: repos can be synced later via /api/github/sync.
      }
      return
    }
    case "deleted": {
      await deleteInstallation(db, installationId)
      return
    }
    case "suspend":
    case "suspended": {
      await setInstallationSuspended(db, installationId, new Date().toISOString())
      return
    }
    case "unsuspend":
    case "unsuspended": {
      await setInstallationSuspended(db, installationId, null)
      return
    }
    case "new_permissions_accepted":
    default:
      return
  }
}

async function handleInstallationRepositories(db: Db, payload: GitHubEventPayload) {
  const installationId = payload.installation?.id
  if (!installationId) return

  const added = payload.repositories_added ?? []
  const removed = payload.repositories_removed ?? []

  if (added.length > 0) {
    await upsertRepositories(db, installationId, added)
  }
  if (removed.length > 0) {
    await disableRepositories(db, removed.map(r => r.id))
  }
}

async function handleRepository(db: Db, payload: GitHubEventPayload) {
  const repo = payload.repository
  if (!repo?.id) return

  const update: Record<string, unknown> = {}
  if (repo.name !== undefined)           update.name = repo.name
  if (repo.full_name !== undefined)      update.full_name = repo.full_name
  if (repo.private !== undefined)        update.private = repo.private
  if (repo.default_branch !== undefined) update.default_branch = repo.default_branch
  if (repo.html_url !== undefined)       update.html_url = repo.html_url

  if (Object.keys(update).length === 0) return

  const { error } = await db
    .from("github_repositories")
    .update(update)
    .eq("github_repo_id", repo.id)

  if (error) throw new Error(`repository update failed: ${error.message}`)
}

async function handlePullRequest(db: Db, payload: GitHubEventPayload) {
  const pr = payload.pull_request
  const repo = payload.repository
  const installationId = payload.installation?.id
  if (!pr || !repo?.id || !repo.full_name || !installationId) return

  const row = {
    installation_id:    installationId,
    github_repo_id:     repo.id,
    repo_full_name:     repo.full_name,
    pr_number:          pr.number,
    pr_title:           pr.title ?? null,
    pr_url:             pr.html_url ?? null,
    branch_name:        pr.head?.ref ?? null,
    base_branch:        pr.base?.ref ?? null,
    state:              pr.state ?? null,
    merged:             pr.merged ?? false,
    github_created_at:  pr.created_at ?? null,
    github_updated_at:  pr.updated_at ?? null
  }

  const { error } = await db
    .from("github_pull_requests")
    .upsert(row, { onConflict: "github_repo_id,pr_number" })

  if (error) throw new Error(`pull_request upsert failed: ${error.message}`)
}
