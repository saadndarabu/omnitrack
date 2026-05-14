export const dynamic = "force-dynamic"

import { notFound, redirect } from "next/navigation"
import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTicketById, dbGetTickets } from "@/lib/db/tickets"
import { dbGetCurrentUser, dbGetUsers } from "@/lib/db/users"
import { dbGetAttachmentCounts } from "@/lib/db/attachments"

export default async function TicketDeepLinkPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db     = await createSupabaseServerClient()

  const [ticket, tickets, users, currentUser] = await Promise.all([
    dbGetTicketById(db, id),
    dbGetTickets(db),
    dbGetUsers(db),
    dbGetCurrentUser(db)
  ])

  if (!currentUser) {
    redirect("/login")
  }

  if (!ticket) notFound()

  const attachmentCounts = await dbGetAttachmentCounts(db, tickets.map((t) => t.id)).catch(() => ({}))

  return (
    <TicketWorkspace
      activeTicketId={ticket.id}
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
      attachmentCounts={attachmentCounts}
    />
  )
}
