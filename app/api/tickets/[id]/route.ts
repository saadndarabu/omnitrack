import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTicketById, dbUpdateTicket, dbDeleteTicket } from "@/lib/db/tickets"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tickets/[id]
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()
    const ticket = await dbGetTicketById(db, id)

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (err) {
    console.error("[GET /api/tickets/[id]]", err)
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

// PATCH /api/tickets/[id]
// Body: UpdateTicketInput — any subset of ticket fields
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()
    const body   = await request.json()

    const ticket = await dbUpdateTicket(db, id, body)
    return NextResponse.json(ticket)
  } catch (err) {
    console.error("[PATCH /api/tickets/[id]]", err)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}

// DELETE /api/tickets/[id]
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()

    await dbDeleteTicket(db, id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]]", err)
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 })
  }
}
