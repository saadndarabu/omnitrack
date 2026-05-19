/**
 * POST /api/github/branches
 *
 * Body:
 *   {
 *     repositoryId: string | number,   // UUID PK or numeric github_repo_id
 *     baseBranch?:  string,            // defaults to repo.default_branch
 *     branchName:   string,
 *     ticketId?:    string             // SIRP-xxx (optional — for traceability)
 *   }
 *
 * Requires an authenticated Supabase user.
 * TODO: gate to authorized users (e.g. ticket assignee) when
 *       roles are wired.
 */

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { createBranchFromBase, GitHubApiError } from "@/lib/github/app"
import { findRepositoryByIdentifier, validateBranchName } from "@/lib/github/repos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    repositoryId?: string | number
    baseBranch?:   string
    branchName?:   string
    ticketId?:     string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.repositoryId || !body.branchName) {
    return NextResponse.json({ error: "repositoryId and branchName are required" }, { status: 400 })
  }

  const invalid = validateBranchName(body.branchName)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const service = createSupabaseServiceRoleClient()
  const repo = await findRepositoryByIdentifier(service, body.repositoryId)
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 })
  if (!repo.enabled) return NextResponse.json({ error: "Repository is disabled" }, { status: 400 })

  const baseBranch = body.baseBranch ?? repo.default_branch
  if (!baseBranch) {
    return NextResponse.json(
      { error: "No baseBranch provided and repository has no default_branch" },
      { status: 400 }
    )
  }

  try {
    const ref = await createBranchFromBase({
      owner:        repo.owner,
      repo:         repo.name,
      baseBranch,
      newBranch:    body.branchName,
      installationId: repo.installation_id
    })

    return NextResponse.json({
      branchName:   body.branchName,
      repoFullName: repo.full_name,
      baseBranch,
      sha:          ref.object.sha,
      url:          `https://github.com/${repo.full_name}/tree/${encodeURIComponent(body.branchName)}`,
      ticketId:     body.ticketId ?? null
    })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      // 422 with "Reference already exists" → branch already there.
      if (err.status === 422 && JSON.stringify(err.body ?? "").includes("Reference already exists")) {
        return NextResponse.json(
          {
            branchName:   body.branchName,
            repoFullName: repo.full_name,
            baseBranch,
            alreadyExists: true,
            url: `https://github.com/${repo.full_name}/tree/${encodeURIComponent(body.branchName)}`
          },
          { status: 200 }
        )
      }
      return NextResponse.json({ error: err.message, status: err.status }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/github/branches]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
