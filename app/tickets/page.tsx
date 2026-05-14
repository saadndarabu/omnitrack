export const dynamic = "force-dynamic"

import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets } from "@/lib/db/tickets"
import { dbGetUsers } from "@/lib/db/users"
import { dbGetAttachmentCounts } from "@/lib/db/attachments"
import { currentUser } from "@/lib/mock-data"

export default async function TicketsPage() {
  const db      = await createSupabaseServerClient()
  const [tickets, users] = await Promise.all([dbGetTickets(db), dbGetUsers(db)])
  const attachmentCounts = await dbGetAttachmentCounts(db, tickets.map((t) => t.id))

  return (
    <TicketWorkspace
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
      attachmentCounts={attachmentCounts}
    />
  )
}
