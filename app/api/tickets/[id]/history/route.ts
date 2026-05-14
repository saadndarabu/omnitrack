import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTicketHistory, dbAddHistoryEntry } from "@/lib/db/tickets"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tickets/[id]/history
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db      = await createSupabaseServerClient()
    const entries = await dbGetTicketHistory(db, id)
    return NextResponse.json(entries)
  } catch (err) {
    console.error("[GET /api/tickets/[id]/history]", err)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}

// POST /api/tickets/[id]/history
// Body: { actorId, field, oldValue, newValue }
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id }                           = await params
    const db                               = await createSupabaseServerClient()
    const { actorId, field, oldValue, newValue } = await request.json()

    if (!actorId || !field) {
      return NextResponse.json({ error: "actorId and field are required" }, { status: 400 })
    }

    await dbAddHistoryEntry(db, {
      ticketId: id,
      actorId,
      field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[POST /api/tickets/[id]/history]", err)
    return NextResponse.json({ error: "Failed to record history" }, { status: 500 })
  }
}
