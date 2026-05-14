import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, NotificationTypeDb } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

export type Notification = {
  id:        string
  userId:    string
  type:      NotificationTypeDb
  ticketId:  string
  actorId:   string | null
  actorName: string | null
  message:   string
  read:      boolean
  createdAt: string
}

export type CreateNotificationInput = {
  userId:   string
  type:     NotificationTypeDb
  ticketId: string
  actorId?: string | null
  message:  string
}

function rowToNotification(
  row: Database["public"]["Tables"]["notifications"]["Row"] & {
    actor?: { name: string } | null
  }
): Notification {
  return {
    id:        row.id,
    userId:    row.user_id,
    type:      row.type,
    ticketId:  row.ticket_id,
    actorId:   row.actor_id,
    actorName: (row.actor as { name: string } | null)?.name ?? null,
    message:   row.message,
    read:      row.read,
    createdAt: row.created_at
  }
}

export async function dbGetNotifications(db: Db, userId: string): Promise<Notification[]> {
  const { data, error } = await db
    .from("notifications")
    .select("*, actor:users!notifications_actor_id_fkey(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []).map(rowToNotification)
}

export async function dbCreateNotification(db: Db, input: CreateNotificationInput): Promise<void> {
  const { error } = await db.from("notifications").insert({
    user_id:   input.userId,
    type:      input.type,
    ticket_id: input.ticketId,
    actor_id:  input.actorId ?? null,
    message:   input.message
  })
  if (error) throw error
}

export async function dbMarkRead(db: Db, notificationId: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
  if (error) throw error
}

export async function dbMarkAllRead(db: Db, userId: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
  if (error) throw error
}
