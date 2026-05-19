/**
 * POST /api/github/sync
 *
 * Manually re-syncs repositories for one (or all active) GitHub
 * App installations. Returns a per-installation summary.
 *
 * Requires an authenticated Supabase user.
 * TODO: gate to admin/product roles once roles are wired through.
 */

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { syncInstallationRepositories } from "@/lib/github/installations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { installationId?: number } = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const service = createSupabaseServiceRoleClient()

  let installations: Array<{ installation_id: number; account_login: string | null }>
  if (body.installationId) {
    const { data, error } = await service
      .from("github_installations")
      .select("installation_id, account_login")
      .eq("installation_id", body.installationId)
      .limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    installations = data ?? []
  } else {
    const { data, error } = await service
      .from("github_installations")
      .select("installation_id, account_login")
      .is("suspended_at", null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    installations = data ?? []
  }

  const results: Array<{
    installationId: number
    accountLogin: string | null
    repositoriesSynced?: number
    error?: string
  }> = []

  for (const installation of installations) {
    try {
      const count = await syncInstallationRepositories(service, installation.installation_id)
      results.push({
        installationId: installation.installation_id,
        accountLogin:   installation.account_login,
        repositoriesSynced: count
      })
    } catch (err) {
      results.push({
        installationId: installation.installation_id,
        accountLogin:   installation.account_login,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const totalSynced = results.reduce((sum, r) => sum + (r.repositoriesSynced ?? 0), 0)
  const errors = results.filter(r => r.error)

  return NextResponse.json({
    installationsProcessed: installations.length,
    repositoriesSynced: totalSynced,
    results,
    errors
  })
}
