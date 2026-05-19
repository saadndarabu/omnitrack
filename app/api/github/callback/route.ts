/**
 * GitHub App setup/install callback.
 *
 * GitHub redirects here after the org owner installs (or
 * reconfigures) the App. Query params:
 *   installation_id  — the new/affected installation
 *   setup_action     — "install" | "update" | "request"
 *   code, state      — user OAuth code (only present if the
 *                      App also requests user identity; we
 *                      don't use it because Supabase Auth
 *                      already handles user identity).
 *
 * Behaviour:
 *   • If installation_id is present, upsert the installation
 *     and sync repositories using an App JWT (no user token).
 *   • Always redirect to /settings/integrations/github/setup
 *     with a `status` query so the page can render state.
 */

import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getInstallationRepositories, githubFetch, createGitHubAppJwt } from "@/lib/github/app"
import { upsertInstallation, upsertRepositories } from "@/lib/github/installations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SETUP_PATH = "/settings/integrations/github/setup"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const installationIdRaw = url.searchParams.get("installation_id")
  const setupAction = url.searchParams.get("setup_action")

  if (!installationIdRaw) {
    return NextResponse.redirect(new URL(`${SETUP_PATH}?status=missing_installation`, request.url))
  }

  const installationId = Number(installationIdRaw)
  if (!Number.isFinite(installationId)) {
    return NextResponse.redirect(new URL(`${SETUP_PATH}?status=invalid_installation`, request.url))
  }

  // Best-effort: capture the Supabase user who clicked install.
  let installedByUserId: string | null = null
  try {
    const userDb = await createSupabaseServerClient()
    const { data } = await userDb.auth.getUser()
    installedByUserId = data.user?.id ?? null
  } catch {
    // No session — that's fine, installation is still valid.
  }

  const db = createSupabaseServiceRoleClient()

  try {
    // Fetch installation metadata via App JWT (not user token).
    const jwt = createGitHubAppJwt()
    const installation = await githubFetch<{
      id: number
      account: { login: string; id: number; type: string }
      repository_selection: string
      app_slug: string
    }>(`/app/installations/${installationId}`, {}, jwt)

    await upsertInstallation(db, {
      installationId:      installation.id,
      accountLogin:        installation.account?.login ?? null,
      accountId:           installation.account?.id ?? null,
      accountType:         installation.account?.type ?? null,
      repositorySelection: installation.repository_selection ?? null,
      appSlug:             installation.app_slug ?? null,
      installedByUserId
    })

    const repos = await getInstallationRepositories(installationId)
    await upsertRepositories(db, installationId, repos)

    const status = setupAction === "update" ? "updated" : "success"
    return NextResponse.redirect(
      new URL(`${SETUP_PATH}?status=${status}&installation_id=${installationId}`, request.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[github/callback] failed", message)
    return NextResponse.redirect(
      new URL(`${SETUP_PATH}?status=error&message=${encodeURIComponent(message)}`, request.url)
    )
  }
}
