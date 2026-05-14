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
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()
    const body   = await request.json()

    // If updating dueDate on a subtask, enforce it doesn't exceed parent's dueDate.
    if (body.dueDate) {
      const current = await dbGetTicketById(db, id)
      if (current?.parentId) {
        const parent = await dbGetTicketById(db, current.parentId)
        if (parent?.dueDate && body.dueDate > parent.dueDate) {
          return NextResponse.json(
            { error: `Subtask due date cannot exceed parent due date (${parent.dueDate})` },
            { status: 422 }
          )
        }
      }

      // If this is a parent, ensure no subtask exceeds the new (earlier) due date.
      if (current && current.subtasks.length > 0) {
        const violating = current.subtasks.find(
          (s) => s.dueDate && s.dueDate > body.dueDate
        )
        if (violating) {
          return NextResponse.json(
            {
              error: `Subtask ${violating.id} has a due date (${violating.dueDate}) that would exceed the new parent due date`
            },
            { status: 422 }
          )
        }
      }
    }

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
