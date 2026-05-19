/**
 * POST /api/github/pulls
 *
 * Body:
 *   {
 *     repositoryId: string | number,
 *     title:        string,
 *     body?:        string,
 *     head:         string,                 // branch name on this repo
 *     base?:        string,                 // defaults to repo.default_branch
 *     draft?:       boolean,
 *     ticketId?:    string                  // SIRP-xxx (optional)
 *   }
 *
 * Requires an authenticated Supabase user.
 */

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { createPullRequest, GitHubApiError } from "@/lib/github/app"
import { findRepositoryByIdentifier } from "@/lib/github/repos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let payload: {
    repositoryId?: string | number
    title?:        string
    body?:         string
    head?:         string
    base?:         string
    draft?:        boolean
    ticketId?:     string
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload.repositoryId || !payload.title || !payload.head) {
    return NextResponse.json(
      { error: "repositoryId, title and head are required" },
      { status: 400 }
    )
  }

  const service = createSupabaseServiceRoleClient()
  const repo = await findRepositoryByIdentifier(service, payload.repositoryId)
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 })
  if (!repo.enabled) return NextResponse.json({ error: "Repository is disabled" }, { status: 400 })

  const base = payload.base ?? repo.default_branch
  if (!base) {
    return NextResponse.json(
      { error: "No base provided and repository has no default_branch" },
      { status: 400 }
    )
  }

  try {
    const pr = await createPullRequest({
      owner:          repo.owner,
      repo:           repo.name,
      title:          payload.title,
      body:           payload.body,
      head:           payload.head,
      base,
      draft:          payload.draft,
      installationId: repo.installation_id
    })

    // Persist the PR record. The webhook will keep it fresh from
    // here on; this insert is just to make the PR immediately
    // visible to the UI without waiting for the webhook round-trip.
    const { error: insertErr } = await service
      .from("github_pull_requests")
      .upsert(
        {
          ticket_id:          payload.ticketId ?? null,
          installation_id:    repo.installation_id,
          github_repo_id:     repo.github_repo_id,
          repo_full_name:     repo.full_name,
          pr_number:          pr.number,
          pr_title:           pr.title,
          pr_url:             pr.html_url,
          branch_name:        pr.head?.ref ?? payload.head,
          base_branch:        pr.base?.ref ?? base,
          state:              pr.state,
          merged:             pr.merged ?? false,
          github_created_at:  pr.created_at ?? null,
          github_updated_at:  pr.updated_at ?? null,
          created_by_user_id: user.id
        },
        { onConflict: "github_repo_id,pr_number" }
      )

    if (insertErr) {
      console.error("[POST /api/github/pulls] DB upsert failed", insertErr)
      // Don't fail the request — the PR exists on GitHub already.
    }

    return NextResponse.json({
      prNumber:     pr.number,
      prUrl:        pr.html_url,
      state:        pr.state,
      repoFullName: repo.full_name,
      head:         pr.head?.ref ?? payload.head,
      base:         pr.base?.ref ?? base
    })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message, status: err.status }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/github/pulls]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
