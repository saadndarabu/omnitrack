export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { BacklogWorkspace } from "@/components/backlog-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets } from "@/lib/db/tickets"
import { dbGetCurrentUser, dbGetUsers } from "@/lib/db/users"
import { dbGetAttachmentCounts } from "@/lib/db/attachments"

export default async function BacklogPage() {
  const db = await createSupabaseServerClient()
  const [allTickets, users, currentUser] = await Promise.all([
    dbGetTickets(db),
    dbGetUsers(db),
    dbGetCurrentUser(db)
  ])

  if (!currentUser) {
    redirect("/login")
  }

  const tickets = allTickets.filter((t) => t.status === "backlog")
  const attachmentCounts = await dbGetAttachmentCounts(db, tickets.map((t) => t.id)).catch(() => ({}))

  return (
    <BacklogWorkspace
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
      attachmentCounts={attachmentCounts}
    />
  )
}
