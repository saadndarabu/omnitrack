export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets } from "@/lib/db/tickets"
import { dbGetCurrentUser, dbGetUsers } from "@/lib/db/users"
import { dbGetAttachmentCounts } from "@/lib/db/attachments"

export default async function TicketsPage() {
  const db      = await createSupabaseServerClient()
  const [tickets, users, currentUser] = await Promise.all([
    dbGetTickets(db),
    dbGetUsers(db),
    dbGetCurrentUser(db)
  ])

  if (!currentUser) {
    redirect("/login")
  }

  const attachmentCounts = await dbGetAttachmentCounts(db, tickets.map((t) => t.id)).catch(() => ({}))

  return (
    <TicketWorkspace
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
      attachmentCounts={attachmentCounts}
    />
  )
}
