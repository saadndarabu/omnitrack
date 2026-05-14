import { notFound } from "next/navigation"
import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTicketById, dbGetTickets } from "@/lib/db/tickets"
import { dbGetUsers } from "@/lib/db/users"
import { currentUser } from "@/lib/mock-data"

export default async function TicketDeepLinkPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db     = await createSupabaseServerClient()

  const [ticket, tickets, users] = await Promise.all([
    dbGetTicketById(db, id),
    dbGetTickets(db),
    dbGetUsers(db)
  ])

  if (!ticket) notFound()

  return (
    <TicketWorkspace
      activeTicketId={ticket.id}
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
    />
  )
}
