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

    // Validate parent assignment changes
    if ("parentId" in body) {
      const newParentId: string | null = body.parentId ?? null

      if (newParentId) {
        const current = await dbGetTicketById(db, id)

        // Epics cannot become children
        if (current?.workType === "epic") {
          return NextResponse.json(
            { error: "Epic tickets cannot be assigned as children of another ticket" },
            { status: 422 }
          )
        }

        const newParent = await dbGetTicketById(db, newParentId)
        if (!newParent) {
          return NextResponse.json({ error: "Parent ticket not found" }, { status: 422 })
        }

        // Parent must not itself be a child
        if (newParent.parentId) {
          return NextResponse.json(
            { error: "Cannot assign a child ticket as a parent" },
            { status: 422 }
          )
        }

        // Prevent self-reference
        if (newParentId === id) {
          return NextResponse.json({ error: "A ticket cannot be its own parent" }, { status: 422 })
        }

        // Auto-promote new parent to epic
        if (newParent.workType !== "epic") {
          await dbUpdateTicket(db, newParentId, { workType: "epic" })
        }
      }

      // If removing a parent, check if old parent should be demoted from epic
      if (!newParentId) {
        const current = await dbGetTicketById(db, id)
        if (current?.parentId) {
          const oldParent = await dbGetTicketById(db, current.parentId)
          if (oldParent && oldParent.workType === "epic") {
            const remainingChildren = oldParent.subtasks.filter((s) => s.id !== id)
            if (remainingChildren.length === 0) {
              // Demote back — default to "task" when losing all children
              await dbUpdateTicket(db, current.parentId, { workType: "task" })
            }
          }
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

    // Before deleting, check if this is a child — if so, maybe demote parent from epic
    const current = await dbGetTicketById(db, id)
    const parentId = current?.parentId ?? null

    await dbDeleteTicket(db, id)

    if (parentId) {
      const parent = await dbGetTicketById(db, parentId)
      if (parent && parent.workType === "epic" && parent.subtasks.length === 0) {
        await dbUpdateTicket(db, parentId, { workType: "task" })
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]]", err)
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 })
  }
}
