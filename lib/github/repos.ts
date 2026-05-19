/**
 * Helpers for resolving and validating a github_repositories row
 * from caller-supplied identifiers (UUID PK or numeric GitHub
 * repo id).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

export type RepoRecord = Database["public"]["Tables"]["github_repositories"]["Row"]

/**
 * `repositoryId` may be either the UUID PK or a numeric github_repo_id.
 * Returns null if not found.
 */
export async function findRepositoryByIdentifier(
  db: Db,
  repositoryId: string | number
): Promise<RepoRecord | null> {
  const asNum = Number(repositoryId)

  if (Number.isFinite(asNum) && !String(repositoryId).includes("-")) {
    const { data, error } = await db
      .from("github_repositories")
      .select("*")
      .eq("github_repo_id", asNum)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data
  }

  const { data, error } = await db
    .from("github_repositories")
    .select("*")
    .eq("id", String(repositoryId))
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

const BRANCH_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/

/**
 * Enforces a conservative branch naming policy:
 *   • Only alphanumerics, dot, underscore, slash, dash
 *   • No leading/trailing slash, no consecutive dots
 *   • Length 1..255
 *
 * Returns an error string, or null if valid.
 *
 * Note: we recommend the `omni/` or `sirp/` prefix but do not
 * enforce it — the caller can layer policy on top.
 */
export function validateBranchName(name: string): string | null {
  if (!name || name.length < 1 || name.length > 255) return "Branch name length must be 1..255"
  if (name.startsWith("/") || name.endsWith("/")) return "Branch name cannot start or end with /"
  if (name.includes("..")) return "Branch name cannot contain '..'"
  if (name.includes(" ")) return "Branch name cannot contain spaces"
  if (!BRANCH_NAME_PATTERN.test(name)) return "Branch name contains unsafe characters"
  return null
}
