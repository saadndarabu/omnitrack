import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { Ticket, TicketComment } from "@/types/ticket"
import type { User } from "@/types/user"
import type { Status } from "@/lib/status"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

// ── Row shapes ────────────────────────────────────────────────

type UserRow    = Database["public"]["Tables"]["users"]["Row"]
type CommentRow = Database["public"]["Tables"]["ticket_comments"]["Row"] & { author: UserRow }
type TicketBaseRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  assignee:        UserRow | null
  ticket_comments: CommentRow[]
}

// Top-level rows include inline subtask rows (no recursive nesting).
type TicketRow = TicketBaseRow & {
  subtasks: TicketBaseRow[]
}

// ── Mappers ───────────────────────────────────────────────────

function rowToUser(row: UserRow): User {
  return {
    id:       row.id,
    name:     row.name,
    email:    row.email as User["email"],
    initials: row.initials,
    role:     row.role as User["role"]
  }
}

function rowToComment(row: CommentRow): TicketComment {
  return {
    id:        row.id,
    author:    rowToUser(row.author),
    body:      row.body,
    createdAt: row.created_at
  }
}

function baseRowToTicket(row: TicketBaseRow, subtasks: Ticket[] = []): Ticket {
  return {
    id:                  row.id,
    title:               row.title,
    description:         row.description,
    workType:            row.work_type,
    status:              row.status as Status,
    priority:            row.priority,
    project:             row.project,
    area:                row.area,
    component:           row.component,
    estimate:            row.estimate,
    dueDate:             row.due_date,
    acceptanceCriteria:  row.acceptance_criteria,
    blockerReason:       row.blocker_reason,
    labels:              row.labels,
    branch:              row.branch,
    prNumber:            row.pr_number,
    assignee:            row.assignee ? rowToUser(row.assignee) : null,
    parentId:            row.parent_id,
    subtasks,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
    comments:            (row.ticket_comments ?? [])
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(rowToComment)
  }
}

function rowToTicket(row: TicketRow): Ticket {
  const subtasks = (row.subtasks ?? []).map((s) => baseRowToTicket(s))
  return baseRowToTicket(row, subtasks)
}

// Subtasks are fetched inline under their parent. The query returns
// all top-level tickets (parent_id IS NULL) with their subtasks nested.
const SUBTASK_SELECT = `
  *,
  assignee:users!tickets_assignee_id_fkey(*),
  ticket_comments(*, author:users!ticket_comments_author_id_fkey(*))
` as const

const TICKET_SELECT = `
  *,
  assignee:users!tickets_assignee_id_fkey(*),
  ticket_comments(*, author:users!ticket_comments_author_id_fkey(*)),
  subtasks:tickets!tickets_parent_id_fkey(${SUBTASK_SELECT})
` as const

// ── Filter / sort params ─────────────────────────────────────

export type TicketFilters = {
  status?:     Status
  priority?:   Ticket["priority"]
  assigneeId?: string | "unassigned"
  project?:    Ticket["project"]
  area?:       Ticket["area"]
  component?:  Ticket["component"]
  workType?:   Ticket["workType"]
  search?:     string
}

export type TicketSortField = "id" | "title" | "status" | "priority" | "due_date" | "updated_at" | "created_at"
export type SortDirection   = "asc" | "desc"

export type TicketListOptions = {
  filters?: TicketFilters
  sort?:    { field: TicketSortField; dir: SortDirection }
}

// ── Read ─────────────────────────────────────────────────────

export async function dbGetTickets(
  db: Db,
  { filters, sort }: TicketListOptions = {}
): Promise<Ticket[]> {
  // Only fetch top-level tickets; subtasks are nested inside them.
  let query = db.from("tickets").select(TICKET_SELECT).is("parent_id", null)

  if (filters?.status)     query = query.eq("status",    filters.status)
  if (filters?.priority)   query = query.eq("priority",  filters.priority)
  if (filters?.project)    query = query.eq("project",   filters.project)
  if (filters?.area)       query = query.eq("area",      filters.area)
  if (filters?.component)  query = query.eq("component", filters.component)
  if (filters?.workType)   query = query.eq("work_type", filters.workType)

  if (filters?.assigneeId === "unassigned") {
    query = query.is("assignee_id", null)
  } else if (filters?.assigneeId) {
    query = query.eq("assignee_id", filters.assigneeId)
  }

  if (filters?.search) {
    const term = `%${filters.search}%`
    query = query.or(`id.ilike.${term},title.ilike.${term}`)
  }

  const { field = "updated_at", dir = "desc" } = sort ?? {}
  query = query.order(field, { ascending: dir === "asc" })

  const { data, error } = await query
  if (error) throw error
  return (data as TicketRow[]).map(rowToTicket)
}

export async function dbGetTicketById(db: Db, id: string): Promise<Ticket | null> {
  const { data, error } = await db
    .from("tickets")
    .select(TICKET_SELECT)
    .ilike("id", id)
    .maybeSingle()

  if (error) throw error
  return data ? rowToTicket(data as TicketRow) : null
}

// ── Create ───────────────────────────────────────────────────

export type CreateTicketInput = {
  id:                  string
  title:               string
  description?:        string
  workType:            Ticket["workType"]
  status?:             Status
  priority?:           Ticket["priority"]
  project:             Ticket["project"]
  area:                Ticket["area"]
  component:           Ticket["component"]
  estimate?:           string | null
  dueDate?:            string | null
  acceptanceCriteria?: string[]
  labels?:             string[]
  assigneeId?:         string | null
  parentId?:           string | null
}

export async function dbCreateTicket(db: Db, input: CreateTicketInput): Promise<Ticket> {
  const { data, error } = await db
    .from("tickets")
    .insert({
      id:                  input.id,
      title:               input.title,
      description:         input.description ?? "",
      work_type:           input.workType,
      status:              input.status ?? "backlog",
      priority:            input.priority ?? "medium",
      project:             input.project,
      area:                input.area,
      component:           input.component,
      estimate:            input.estimate ?? null,
      due_date:            input.dueDate ?? null,
      acceptance_criteria: input.acceptanceCriteria ?? [],
      labels:              input.labels ?? [],
      assignee_id:         input.assigneeId ?? null,
      parent_id:           input.parentId ?? null
    })
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return rowToTicket(data as TicketRow)
}

// ── Update ───────────────────────────────────────────────────

export type UpdateTicketInput = Partial<{
  title:               string
  description:         string
  workType:            Ticket["workType"]
  status:              Status
  priority:            Ticket["priority"]
  project:             Ticket["project"]
  area:                Ticket["area"]
  component:           Ticket["component"]
  estimate:            string | null
  dueDate:             string | null
  acceptanceCriteria:  string[]
  blockerReason:       string | null
  labels:              string[]
  branch:              string | null
  prNumber:            number | null
  assigneeId:          string | null
  parentId:            string | null
}>

export async function dbUpdateTicket(
  db: Db,
  id: string,
  input: UpdateTicketInput
): Promise<Ticket> {
  const patch: Database["public"]["Tables"]["tickets"]["Update"] = {}

  if (input.title               !== undefined) patch.title               = input.title
  if (input.description         !== undefined) patch.description         = input.description
  if (input.workType            !== undefined) patch.work_type           = input.workType
  if (input.status              !== undefined) patch.status              = input.status
  if (input.priority            !== undefined) patch.priority            = input.priority
  if (input.project             !== undefined) patch.project             = input.project
  if (input.area                !== undefined) patch.area                = input.area
  if (input.component           !== undefined) patch.component           = input.component
  if (input.estimate            !== undefined) patch.estimate            = input.estimate
  if (input.dueDate             !== undefined) patch.due_date            = input.dueDate
  if (input.acceptanceCriteria  !== undefined) patch.acceptance_criteria = input.acceptanceCriteria
  if (input.blockerReason       !== undefined) patch.blocker_reason      = input.blockerReason
  if (input.labels              !== undefined) patch.labels              = input.labels
  if (input.branch              !== undefined) patch.branch              = input.branch
  if (input.prNumber            !== undefined) patch.pr_number           = input.prNumber
  if (input.assigneeId          !== undefined) patch.assignee_id         = input.assigneeId
  if (input.parentId            !== undefined) patch.parent_id           = input.parentId

  const { data, error } = await db
    .from("tickets")
    .update(patch)
    .eq("id", id)
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return rowToTicket(data as TicketRow)
}

// ── Delete ───────────────────────────────────────────────────

export async function dbDeleteTicket(db: Db, id: string): Promise<void> {
  const { error } = await db.from("tickets").delete().eq("id", id)
  if (error) throw error
}

// ── Comments ─────────────────────────────────────────────────

export async function dbAddComment(
  db: Db,
  ticketId: string,
  authorId: string,
  body: string
): Promise<TicketComment> {
  const { data, error } = await db
    .from("ticket_comments")
    .insert({ ticket_id: ticketId, author_id: authorId, body })
    .select("*, author:users!ticket_comments_author_id_fkey(*)")
    .single()

  if (error) throw error
  return rowToComment(
    data as CommentRow
  )
}

export async function dbDeleteComment(db: Db, commentId: string): Promise<void> {
  const { error } = await db.from("ticket_comments").delete().eq("id", commentId)
  if (error) throw error
}

// ── Next ID helper ────────────────────────────────────────────

export async function dbNextTicketId(db: Db): Promise<string> {
  const { data, error } = await db
    .from("tickets")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data) return "SIRP-1"

  const num = parseInt(data.id.replace(/^SIRP-/i, ""), 10)
  return `SIRP-${isNaN(num) ? 1 : num + 1}`
}

// ── History ───────────────────────────────────────────────────

export type HistoryEntry = {
  id:        string
  ticketId:  string
  actorId:   string
  actorName: string
  field:     string
  oldValue:  string | null
  newValue:  string | null
  createdAt: string
}

export type AddHistoryInput = {
  ticketId: string
  actorId:  string
  field:    string
  oldValue: string | null
  newValue: string | null
}

export async function dbAddHistoryEntry(db: Db, input: AddHistoryInput): Promise<void> {
  const { error } = await db.from("ticket_history").insert({
    ticket_id: input.ticketId,
    actor_id:  input.actorId,
    field:     input.field,
    old_value: input.oldValue,
    new_value: input.newValue
  })
  if (error) throw error
}

export async function dbGetTicketHistory(db: Db, ticketId: string): Promise<HistoryEntry[]> {
  const { data, error } = await db
    .from("ticket_history")
    .select("*, actor:users!ticket_history_actor_id_fkey(name)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id:        row.id,
    ticketId:  row.ticket_id,
    actorId:   row.actor_id,
    actorName: (row.actor as { name: string } | null)?.name ?? row.actor_id,
    field:     row.field,
    oldValue:  row.old_value,
    newValue:  row.new_value,
    createdAt: row.created_at
  }))
}
