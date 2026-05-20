import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets, dbCreateTicket, dbNextTicketId, dbGetTicketById, dbUpdateTicket } from "@/lib/db/tickets"
import type { TicketFilters, TicketSortField, SortDirection } from "@/lib/db/tickets"
import type { Status } from "@/lib/status"
import type { Ticket } from "@/types/ticket"

// GET /api/tickets
export async function GET(request: Request) {
  try {
    const db     = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const filters: TicketFilters = {}
    const status = searchParams.get("status")
    if (status) filters.status = status as Status

    const priority = searchParams.get("priority")
    if (priority) filters.priority = priority as Ticket["priority"]

    const assigneeId = searchParams.get("assigneeId")
    if (assigneeId) filters.assigneeId = assigneeId

    const project = searchParams.get("project")
    if (project) filters.project = project as Ticket["project"]

    const area = searchParams.get("area")
    if (area) filters.area = area as Ticket["area"]

    const component = searchParams.get("component")
    if (component) filters.component = component as Ticket["component"]

    const workType = searchParams.get("workType")
    if (workType) filters.workType = workType as Ticket["workType"]

    const search = searchParams.get("search")
    if (search) filters.search = search

    const sortField = (searchParams.get("sortField") ?? "updated_at") as TicketSortField
    const sortDir   = (searchParams.get("sortDir")   ?? "desc")       as SortDirection

    const tickets = await dbGetTickets(db, {
      filters,
      sort: { field: sortField, dir: sortDir }
    })

    return NextResponse.json(tickets)
  } catch (err) {
    console.error("[GET /api/tickets]", err)
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
  }
}

// POST /api/tickets
export async function POST(request: Request) {
  try {
    const db   = await createSupabaseServerClient()
    const body = await request.json()

    const parentId: string | null = body.parentId ?? null

    if (parentId) {
      const parent = await dbGetTicketById(db, parentId)

      if (!parent) {
        return NextResponse.json({ error: "Parent ticket not found" }, { status: 422 })
      }

      // Epics cannot be children of another ticket
      if (parent.workType === "epic" && parent.parentId) {
        return NextResponse.json(
          { error: "Children cannot be nested under another child ticket" },
          { status: 422 }
        )
      }

      // Children cannot be epics
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Child tickets cannot have their own children" },
          { status: 422 }
        )
      }
    }

    // A ticket being assigned as a child must not itself be an epic
    if (parentId && body.workType === "epic") {
      return NextResponse.json(
        { error: "Epic tickets cannot be children of another ticket" },
        { status: 422 }
      )
    }

    const id = await dbNextTicketId(db)

    const ticket = await dbCreateTicket(db, {
      id,
      title:               body.title,
      description:         body.description,
      workType:            body.workType,
      status:              body.status,
      priority:            body.priority,
      project:             body.project,
      area:                body.area,
      component:           body.component,
      estimate:            body.estimate ?? null,
      dueDate:             body.dueDate  ?? null,
      acceptanceCriteria:  body.acceptanceCriteria ?? [],
      labels:              body.labels ?? [],
      assigneeId:          body.assigneeId ?? null,
      parentId
    })

    // Auto-promote parent to epic when it gets its first child
    if (parentId) {
      const parent = await dbGetTicketById(db, parentId)
      if (parent && parent.workType !== "epic") {
        await dbUpdateTicket(db, parentId, { workType: "epic" })
      }
    }

    return NextResponse.json(ticket, { status: 201 })
  } catch (err) {
    console.error("[POST /api/tickets]", err)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}
