import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { User, UserArea, UserRole } from "@/types/user"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

function rowToUser(row: Database["public"]["Tables"]["users"]["Row"]): User {
  return {
    id:                row.id,
    name:              row.name,
    email:             row.email as User["email"],
    initials:          row.initials,
    role:              row.role as UserRole,
    areas:             (row.areas ?? []) as UserArea[],
    avatarUrl:         row.avatar_url ?? null,
    githubUsername:    row.github_username ?? null,
    githubEmail:       row.github_email ?? null,
    githubConnectedAt: row.github_connected_at ?? null,
  }
}

export async function dbGetUsers(db: Db): Promise<User[]> {
  const { data, error } = await db
    .from("users")
    .select("*")
    .order("name")

  if (error) throw error
  return (data ?? []).map(rowToUser)
}

export async function dbGetUserById(db: Db, id: string): Promise<User | null> {
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data ? rowToUser(data) : null
}

export async function dbGetCurrentUser(db: Db): Promise<User | null> {
  const { data: { user: authUser } } = await db.auth.getUser()
  if (!authUser) return null
  return dbGetUserById(db, authUser.id)
}

export async function dbSetUserRole(db: Db, userId: string, role: UserRole): Promise<void> {
  const { error } = await db
    .from("users")
    .update({ role })
    .eq("id", userId)

  if (error) throw error
}

export async function dbUpdateProfile(
  db: Db,
  userId: string,
  patch: { name?: string; areas?: UserArea[]; avatar_url?: string | null }
): Promise<User> {
  // Recompute initials if name changes
  const updates: Database["public"]["Tables"]["users"]["Update"] = {}
  if (patch.name !== undefined) {
    updates.name = patch.name
    updates.initials = patch.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("")
      || patch.name[0].toUpperCase()
  }
  if (patch.areas !== undefined)      updates.areas      = patch.areas
  if (patch.avatar_url !== undefined) updates.avatar_url = patch.avatar_url

  const { data, error } = await db
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single()

  if (error) throw error
  return rowToUser(data)
}

export async function dbConnectGitHub(
  db: Db,
  userId: string,
  github_username: string,
  github_email: string
): Promise<void> {
  const { error } = await db
    .from("users")
    .update({
      github_username,
      github_email,
      github_connected_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) throw error
}

export async function dbDisconnectGitHub(db: Db, userId: string): Promise<void> {
  const { error } = await db
    .from("users")
    .update({
      github_username:     null,
      github_email:        null,
      github_connected_at: null,
    })
    .eq("id", userId)

  if (error) throw error
}
