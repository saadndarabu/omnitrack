import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetTickets, dbCreateTicket, dbNextTicketId } from "@/lib/db/tickets"
import type { TicketFilters, TicketSortField, SortDirection } from "@/lib/db/tickets"
import type { Status } from "@/lib/status"
import type { Ticket } from "@/types/ticket"

// GET /api/tickets
// Query params: status, priority, assigneeId, project, area, component, workType, search, sortField, sortDir
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
// Body: CreateTicketInput (minus id, which is auto-assigned)
export async function POST(request: Request) {
  try {
    const db   = await createSupabaseServerClient()
    const body = await request.json()

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
      assigneeId:          body.assigneeId ?? null
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (err) {
    console.error("[POST /api/tickets]", err)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}
