import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { User, UserRole } from "@/types/user"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

function rowToUser(row: Database["public"]["Tables"]["users"]["Row"]): User {
  return {
    id:       row.id,
    name:     row.name,
    email:    row.email as User["email"],
    initials: row.initials,
    role:     row.role as UserRole
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
