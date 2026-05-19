/**
 * DB helpers for GitHub App installation + repository records.
 * All writes use the service-role client (RLS bypass) — these
 * tables are server-managed integration metadata.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getInstallationRepositories, type GitHubRepoSummary } from "@/lib/github/app"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

export type InstallationUpsertInput = {
  installationId: number
  accountLogin?: string | null
  accountId?: number | null
  accountType?: string | null
  repositorySelection?: string | null
  appSlug?: string | null
  installedByUserId?: string | null
  suspendedAt?: string | null
}

export async function upsertInstallation(db: Db, input: InstallationUpsertInput) {
  const row = {
    installation_id:      input.installationId,
    account_login:        input.accountLogin ?? null,
    account_id:           input.accountId ?? null,
    account_type:         input.accountType ?? null,
    repository_selection: input.repositorySelection ?? null,
    app_slug:             input.appSlug ?? null,
    installed_by_user_id: input.installedByUserId ?? null,
    suspended_at:         input.suspendedAt ?? null
  }

  const { error } = await db
    .from("github_installations")
    .upsert(row, { onConflict: "installation_id" })

  if (error) throw new Error(`upsertInstallation failed: ${error.message}`)
}

export async function setInstallationSuspended(
  db: Db,
  installationId: number,
  suspendedAt: string | null
) {
  const { error } = await db
    .from("github_installations")
    .update({ suspended_at: suspendedAt })
    .eq("installation_id", installationId)

  if (error) throw new Error(`setInstallationSuspended failed: ${error.message}`)
}

export async function deleteInstallation(db: Db, installationId: number) {
  // CASCADE will drop github_repositories rows.
  const { error } = await db
    .from("github_installations")
    .delete()
    .eq("installation_id", installationId)

  if (error) throw new Error(`deleteInstallation failed: ${error.message}`)
}

// ── Repositories ─────────────────────────────────────────────

type RepoLike = {
  id: number
  name: string
  full_name: string
  private?: boolean
  default_branch?: string
  html_url?: string
  owner?: { login?: string }
}

function toRepoRow(installationId: number, repo: RepoLike) {
  const owner = repo.owner?.login ?? repo.full_name.split("/")[0]
  return {
    installation_id: installationId,
    github_repo_id:  repo.id,
    owner,
    name:            repo.name,
    full_name:       repo.full_name,
    private:         repo.private ?? true,
    default_branch:  repo.default_branch ?? null,
    html_url:        repo.html_url ?? null,
    enabled:         true
  }
}

export async function upsertRepositories(
  db: Db,
  installationId: number,
  repos: RepoLike[]
) {
  if (repos.length === 0) return
  const rows = repos.map(r => toRepoRow(installationId, r))

  const { error } = await db
    .from("github_repositories")
    .upsert(rows, { onConflict: "github_repo_id" })

  if (error) throw new Error(`upsertRepositories failed: ${error.message}`)
}

export async function disableRepositories(db: Db, repoIds: number[]) {
  if (repoIds.length === 0) return
  const { error } = await db
    .from("github_repositories")
    .update({ enabled: false })
    .in("github_repo_id", repoIds)

  if (error) throw new Error(`disableRepositories failed: ${error.message}`)
}

/**
 * Fetch installation repos from GitHub and upsert them.
 * Returns the count synced.
 */
export async function syncInstallationRepositories(db: Db, installationId: number): Promise<number> {
  const repos: GitHubRepoSummary[] = await getInstallationRepositories(installationId)
  await upsertRepositories(db, installationId, repos)
  return repos.length
}
