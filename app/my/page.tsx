export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { TicketWorkspace } from "@/components/ticket-workspace"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets } from "@/lib/db/tickets"
import { dbGetCurrentUser, dbGetUsers } from "@/lib/db/users"
import { dbGetAttachmentCounts } from "@/lib/db/attachments"

export default async function MyTicketsPage() {
  const db = await createSupabaseServerClient()
  const [currentUser, users] = await Promise.all([dbGetCurrentUser(db), dbGetUsers(db)])

  if (!currentUser) redirect("/login")

  const tickets = await dbGetTickets(db, {
    filters: { assigneeId: currentUser.id }
  })

  const attachmentCounts = await dbGetAttachmentCounts(db, tickets.map((t) => t.id)).catch(() => ({}))

  return (
    <TicketWorkspace
      view="my"
      initialTickets={tickets}
      currentUser={currentUser}
      users={users}
      attachmentCounts={attachmentCounts}
    />
  )
}
