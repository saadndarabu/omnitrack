export const dynamic = "force-dynamic"

import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets } from "@/lib/db/tickets"
import { dbGetUsers } from "@/lib/db/users"
import { currentUser } from "@/lib/mock-data"

export default async function TicketsPage() {
  const db      = await createSupabaseServerClient()
  const tickets = await dbGetTickets(db)
  const users   = await dbGetUsers(db)

  return (
    <TicketWorkspace initialTickets={tickets} currentUser={currentUser} users={users} />
  )
}
