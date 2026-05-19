/**
 * POST /api/github/create-pr-from-ticket
 *
 * Body:
 *   {
 *     ticketId:     string,        // SIRP-xxx
 *     repositoryId: string|number,
 *     title?:       string,        // defaults to ticket.title
 *     description?: string,
 *     baseBranch?:  string,        // defaults to repo.default_branch
 *     draft?:       boolean
 *   }
 *
 * Generates a safe branch name (`omni/ticket-{id}-{slug}`),
 * creates the branch from the base, opens the PR, and returns
 * the PR url + branch.
 *
 * Requires an authenticated Supabase user.
 */

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { findRepositoryByIdentifier, validateBranchName } from "@/lib/github/repos"
import { createBranchFromBase, createPullRequest, GitHubApiError } from "@/lib/github/app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "ticket"
}

export async function POST(request: Request) {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    ticketId?:     string
    repositoryId?: string | number
    title?:        string
    description?:  string
    baseBranch?:   string
    draft?:        boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.ticketId || !body.repositoryId) {
    return NextResponse.json({ error: "ticketId and repositoryId are required" }, { status: 400 })
  }

  // Load the ticket for title/slug. The user's session client is
  // used here so RLS is honored when reading tickets.
  const { data: ticket, error: ticketErr } = await db
    .from("tickets")
    .select("id, title")
    .eq("id", body.ticketId)
    .maybeSingle()

  if (ticketErr) return NextResponse.json({ error: ticketErr.message }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

  const service = createSupabaseServiceRoleClient()
  const repo = await findRepositoryByIdentifier(service, body.repositoryId)
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 })
  if (!repo.enabled) return NextResponse.json({ error: "Repository is disabled" }, { status: 400 })

  const base = body.baseBranch ?? repo.default_branch
  if (!base) {
    return NextResponse.json(
      { error: "No baseBranch provided and repository has no default_branch" },
      { status: 400 }
    )
  }

  const title = body.title ?? ticket.title
  const branchName = `omni/ticket-${ticket.id.toLowerCase()}-${slugify(title)}`

  const invalid = validateBranchName(branchName)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    // 1. Branch (idempotent: already-exists is treated as ok).
    try {
      await createBranchFromBase({
        owner:          repo.owner,
        repo:           repo.name,
        baseBranch:     base,
        newBranch:      branchName,
        installationId: repo.installation_id
      })
    } catch (err) {
      if (
        err instanceof GitHubApiError &&
        err.status === 422 &&
        JSON.stringify(err.body ?? "").includes("Reference already exists")
      ) {
        // continue — branch already there
      } else {
        throw err
      }
    }

    // 2. PR.
    const description = body.description
      ?? `Linked ticket: ${ticket.id}\n\n${ticket.title}`

    const pr = await createPullRequest({
      owner:          repo.owner,
      repo:           repo.name,
      title,
      body:           description,
      head:           branchName,
      base,
      draft:          body.draft ?? false,
      installationId: repo.installation_id
    })

    // 3. Record in github_pull_requests + link the ticket.
    await service
      .from("github_pull_requests")
      .upsert(
        {
          ticket_id:          ticket.id,
          installation_id:    repo.installation_id,
          github_repo_id:     repo.github_repo_id,
          repo_full_name:     repo.full_name,
          pr_number:          pr.number,
          pr_title:           pr.title,
          pr_url:             pr.html_url,
          branch_name:        branchName,
          base_branch:        base,
          state:              pr.state,
          merged:             pr.merged ?? false,
          github_created_at:  pr.created_at ?? null,
          github_updated_at:  pr.updated_at ?? null,
          created_by_user_id: user.id
        },
        { onConflict: "github_repo_id,pr_number" }
      )

    // Best-effort: update the ticket with branch + pr_number.
    await db
      .from("tickets")
      .update({ branch: branchName, pr_number: pr.number })
      .eq("id", ticket.id)

    return NextResponse.json({
      ticketId:     ticket.id,
      repoFullName: repo.full_name,
      branchName,
      baseBranch:   base,
      prNumber:     pr.number,
      prUrl:        pr.html_url,
      state:        pr.state
    })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message, status: err.status }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/github/create-pr-from-ticket]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
