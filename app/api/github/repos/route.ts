/**
 * GET  /api/github/repos        — list synced, enabled repositories
 * POST /api/github/repos        — manually sync repositories
 *                                  (delegates to /api/github/sync logic)
 *
 * Requires an authenticated Supabase user. Tokens never leave
 * the server.
 */

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { syncInstallationRepositories } from "@/lib/github/installations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("github_repositories")
    .select("id, github_repo_id, installation_id, full_name, owner, name, default_branch, private, html_url")
    .eq("enabled", true)
    .order("full_name")

  if (error) {
    console.error("[GET /api/github/repos]", error)
    return NextResponse.json({ error: "Failed to load repositories" }, { status: 500 })
  }

  return NextResponse.json({ repositories: data ?? [] })
}

export async function POST(request: Request) {
  const userDb = await createSupabaseServerClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // TODO: gate to admin/product roles once roles are wired.

  let body: { installationId?: number } = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const service = createSupabaseServiceRoleClient()

  let installationIds: number[]
  if (body.installationId) {
    installationIds = [body.installationId]
  } else {
    const { data, error } = await service
      .from("github_installations")
      .select("installation_id")
      .is("suspended_at", null)

    if (error) {
      console.error("[POST /api/github/repos]", error)
      return NextResponse.json({ error: "Failed to load installations" }, { status: 500 })
    }
    installationIds = (data ?? []).map(r => r.installation_id as number)
  }

  let synced = 0
  const errors: Array<{ installationId: number; message: string }> = []
  for (const id of installationIds) {
    try {
      synced += await syncInstallationRepositories(service, id)
    } catch (err) {
      errors.push({ installationId: id, message: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({
    installationsProcessed: installationIds.length,
    repositoriesSynced: synced,
    errors
  })
}
