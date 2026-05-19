/**
 * Server-only Slack admin helper.
 *
 * This is a single-tenant SIRP deployment with no workspaces table.
 * We use a fixed constant UUID as workspace_id for all Slack records.
 * A future multi-tenant migration would introduce a workspaces table
 * and derive workspace_id from the authenticated user's org row.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser } from "@/lib/db/users"
import { isAdmin } from "@/types/user"
import type { User } from "@/types/user"

// Fixed workspace UUID for this single-tenant SIRP deployment.
// All slack_connections rows use this as workspace_id.
export const SIRP_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"

export type AdminContext = {
  userId: string
  user: User
  workspaceId: string
}

export class UnauthorizedError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.status = 403
  }
}

export class UnauthenticatedError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.status = 401
  }
}

/**
 * Resolves the current authenticated admin user and workspace_id.
 * Throws UnauthenticatedError (401) if no session.
 * Throws UnauthorizedError (403) if the user is not admin.
 */
export async function requireAdminWorkspace(): Promise<AdminContext> {
  const db   = await createSupabaseServerClient()
  const user = await dbGetCurrentUser(db)

  if (!user) throw new UnauthenticatedError("Authentication required")
  if (!isAdmin(user)) throw new UnauthorizedError("Admin access required")

  return {
    userId:      user.id,
    user,
    workspaceId: SIRP_WORKSPACE_ID,
  }
}
