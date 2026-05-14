"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlertOctagon, CalendarDays, Check, Loader2, SlidersHorizontal, SquareDashed, X } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { StatusIcon } from "@/components/status-icon"
import { Popover } from "@/components/ui/popover"
import {
  PriorityCell,
  WorkTypeCell,
  formatDueDate
} from "@/components/ticket-table-columns"
import { canTransition, STATUS_LABELS, STATUSES, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Priority, Ticket, WorkType } from "@/types/ticket"
import type { User } from "@/types/user"

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"]
const PRIORITY_LABELS: Record<Priority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" }
const PRIORITY_DOT: Record<Priority, string> = {
  critical: "bg-[var(--status-blocked)]",
  high: "bg-[var(--status-progress)]",
  medium: "bg-[var(--status-review)]",
  low: "bg-[var(--text-faint)]"
}

type BoardColumns = Record<Status, Ticket[]>

function groupTicketsByStatus(tickets: Ticket[]): BoardColumns {
  return STATUSES.reduce(
    (acc, status) => {
      acc[status] = tickets
        .filter((ticket) => ticket.status === status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return acc
    },
    {} as BoardColumns
  )
}

function findContainer(columns: BoardColumns, id: string): Status | null {
  if (STATUSES.includes(id as Status)) {
    return id as Status
  }

  return (
    STATUSES.find((status) => columns[status].some((ticket) => ticket.id === id)) ??
    null
  )
}

export function TicketKanban({
  globalFilter = "",
  onOpen,
  onQuickCreate,
  onStatusChange,
  selectedId,
  tickets,
  users
}: {
  globalFilter?: string
  onOpen: (ticketId: string) => void
  onQuickCreate: (input: {
    assignee: User | null
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }) => void
  onStatusChange: (ticketId: string, status: Status) => boolean | Promise<boolean>
  selectedId: string | null
  tickets: Ticket[]
  users: User[]
}) {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null)
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<Status>>(new Set(STATUSES))
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [savingTicketIds, setSavingTicketIds] = useState<Record<string, boolean>>({})
  const suppressOpenUntilRef = useRef(0)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter && ticket.status !== statusFilter) return false
      if (priorityFilter && ticket.priority !== priorityFilter) return false
      if (ownerFilter) {
        const name = ticket.assignee?.name ?? "Unassigned"
        if (name !== ownerFilter) return false
      }
      if (globalFilter) {
        const needle = globalFilter.trim().toLowerCase()
        const match = [
          ticket.id,
          ticket.title,
          ticket.description,
          ticket.workType,
          ticket.priority,
          ticket.assignee?.name ?? "Unassigned",
          ticket.area,
          ticket.component,
          ...ticket.labels
        ].join(" ").toLowerCase().includes(needle)
        if (!match) return false
      }
      return true
    })
  }, [globalFilter, statusFilter, priorityFilter, ownerFilter, tickets])

  const ticketsByStatus = useMemo(
    () => groupTicketsByStatus(filteredTickets),
    [filteredTickets]
  )
  const [boardColumns, setBoardColumns] = useState<BoardColumns>(ticketsByStatus)
  const boardColumnsRef = useRef(boardColumns)

  useEffect(() => {
    if (activeTicketId) return

    // Merge server state into local board: preserve local ordering but
    // adopt status changes, new tickets, and removals from the server.
    setBoardColumns((current) => {
      const merged = STATUSES.reduce(
        (acc, status) => {
          const serverIds = new Set(ticketsByStatus[status].map((t) => t.id))
          const localOrdered = current[status].filter((t) => serverIds.has(t.id))
          const localIds = new Set(localOrdered.map((t) => t.id))
          const newTickets = ticketsByStatus[status].filter((t) => !localIds.has(t.id))
          acc[status] = [...localOrdered, ...newTickets].map(
            (t) => ticketsByStatus[status].find((s) => s.id === t.id) ?? t
          )
          return acc
        },
        {} as BoardColumns
      )
      boardColumnsRef.current = merged
      return merged
    })
  }, [ticketsByStatus])

  function updateBoardColumns(
    updater: BoardColumns | ((current: BoardColumns) => BoardColumns)
  ) {
    setBoardColumns((current) => {
      const next = typeof updater === "function" ? updater(current) : updater
      boardColumnsRef.current = next
      return next
    })
  }

  const activeTicket = activeTicketId
    ? tickets.find((ticket) => ticket.id === activeTicketId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveTicketId(String(event.active.id))
    boardColumnsRef.current = boardColumns
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    updateBoardColumns((current) => {
      const activeContainer = findContainer(current, activeId)
      const overContainer = findContainer(current, overId)

      if (!activeContainer || !overContainer) {
        return current
      }

      const activeItems = current[activeContainer]
      const activeIndex = activeItems.findIndex((ticket) => ticket.id === activeId)
      const activeTicket = activeItems[activeIndex]

      if (!activeTicket) {
        return current
      }

      if (
        activeContainer !== overContainer &&
        overContainer !== activeTicket.status &&
        !canTransition(activeTicket.status, overContainer)
      ) {
        return current
      }

      if (activeContainer === overContainer) {
        const overIndex = current[overContainer].findIndex(
          (ticket) => ticket.id === overId
        )

        if (overIndex === -1 || overIndex === activeIndex) {
          return current
        }

        return {
          ...current,
          [activeContainer]: arrayMove(current[activeContainer], activeIndex, overIndex)
        }
      }

      const overItems = current[overContainer]
      const overIndex = overItems.findIndex((ticket) => ticket.id === overId)
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length

      return {
        ...current,
        [activeContainer]: activeItems.filter((ticket) => ticket.id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, insertIndex),
          activeTicket,
          ...overItems.slice(insertIndex)
        ]
      }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTicketId(null)
    suppressOpenUntilRef.current = Date.now() + 250

    if (!over) {
      updateBoardColumns(ticketsByStatus)
      return
    }

    const ticketId = String(active.id)
    const activeTicket = tickets.find((ticket) => ticket.id === ticketId)
    if (!activeTicket) {
      return
    }

    const overId = String(over.id)
    const targetStatus =
      findContainer(boardColumnsRef.current, ticketId) ??
      findContainer(boardColumnsRef.current, overId)

    // Same-column reorder: keep the dragged order, don't reset
    if (!targetStatus || targetStatus === activeTicket.status) {
      return
    }

    setSavingTicketIds((current) => ({ ...current, [ticketId]: true }))
    const updated = await Promise.resolve(onStatusChange(ticketId, targetStatus))

    if (!updated) {
      updateBoardColumns(ticketsByStatus)
    }

    window.setTimeout(() => {
      setSavingTicketIds((current) => {
        const { [ticketId]: _removed, ...rest } = current
        return rest
      })
    }, 450)
  }

  function handleDragCancel() {
    setActiveTicketId(null)
    suppressOpenUntilRef.current = Date.now() + 250
    updateBoardColumns(ticketsByStatus)
  }

  function openTicket(ticketId: string) {
    if (Date.now() < suppressOpenUntilRef.current) {
      return
    }

    onOpen(ticketId)
  }

  const activeFilters: Array<{ key: string; label: string; onClear: () => void }> = []
  if (statusFilter) activeFilters.push({ key: "status", label: `Status: ${STATUS_LABELS[statusFilter]}`, onClear: () => setStatusFilter(null) })
  if (priorityFilter) activeFilters.push({ key: "priority", label: `Priority: ${PRIORITY_LABELS[priorityFilter]}`, onClear: () => setPriorityFilter(null) })
  if (ownerFilter) activeFilters.push({ key: "owner", label: `Owner: ${ownerFilter}`, onClear: () => setOwnerFilter(null) })

  return (
    <div>
      {/* Toolbar */}
      <div className="mx-auto mb-3 flex max-w-[1440px] items-center gap-2 px-3 sm:px-6 lg:px-8">
        {/* Filters */}
        <Popover
          panelClassName="w-[280px] p-3"
          trigger={
            <button
              type="button"
              className={cn(
                "inline-flex h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-colors",
                activeFilters.length > 0
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              )}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilters.length > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
                  {activeFilters.length}
                </span>
              )}
            </button>
          }
        >
          {(close) => (
            <div className="flex flex-col gap-4">
              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Status</span>
                  {statusFilter && (
                    <button type="button" onClick={() => setStatusFilter(null)} className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]">Clear</button>
                  )}
                </div>
                <KanbanFilterList
                  items={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], leading: <StatusIcon status={s} size={14} /> }))}
                  value={statusFilter}
                  onSelect={(v) => setStatusFilter(v === statusFilter ? null : v as Status)}
                />
              </div>
              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Priority</span>
                  {priorityFilter && (
                    <button type="button" onClick={() => setPriorityFilter(null)} className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]">Clear</button>
                  )}
                </div>
                <KanbanFilterList
                  items={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p], leading: <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[p])} /> }))}
                  value={priorityFilter}
                  onSelect={(v) => setPriorityFilter(v === priorityFilter ? null : v as Priority)}
                />
              </div>
              {/* Owner */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-[650] uppercase tracking-[0.06em] text-[var(--text-faint)]">Owner</span>
                  {ownerFilter && (
                    <button type="button" onClick={() => setOwnerFilter(null)} className="text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]">Clear</button>
                  )}
                </div>
                <KanbanFilterList
                  items={[
                    { value: "Unassigned", label: "Unassigned" },
                    ...users.map((u) => ({ value: u.name, label: u.name }))
                  ]}
                  value={ownerFilter}
                  onSelect={(v) => setOwnerFilter(v === ownerFilter ? null : v)}
                />
              </div>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter(null); setPriorityFilter(null); setOwnerFilter(null); close() }}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </Popover>

        {/* Columns (visible status lanes) */}
        <Popover
          align="end"
          panelClassName="w-[200px] p-1"
          trigger={
            <button
              type="button"
              className="inline-flex h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text-muted)] shadow-[0_1px_1px_rgba(0,0,0,0.02)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              <SlidersHorizontal size={13} />
              Columns
              <span className="text-[11px] text-[var(--text-faint)]">{visibleStatuses.size}</span>
            </button>
          }
        >
          {() => (
            <div className="max-h-[320px] overflow-y-auto">
              {STATUSES.map((status) => {
                const visible = visibleStatuses.has(status)
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setVisibleStatuses((prev) => {
                      const next = new Set(prev)
                      if (next.has(status)) next.delete(status)
                      else next.add(status)
                      return next
                    })}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    <span className="flex items-center gap-2">
                      <StatusIcon status={status} size={13} />
                      {STATUS_LABELS[status]}
                    </span>
                    {visible && <Check size={13} className="text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          )}
        </Popover>

        {/* Active filter chips */}
        {activeFilters.map((f) => (
          <span
            key={f.key}
            className="inline-flex h-[40px] items-center gap-1.5 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-[12px] font-medium text-[var(--accent)]"
          >
            {f.label}
            <button
              type="button"
              onClick={f.onClear}
              aria-label={`Remove ${f.label} filter`}
              className="rounded p-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      <DndContext
        id="ticket-kanban-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex max-h-[calc(100vh-196px)] gap-3 overflow-x-auto px-3 py-2 sm:px-6 lg:px-8">
          {STATUSES.filter((s) => visibleStatuses.has(s)).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={boardColumns[status]}
              selectedId={selectedId}
              savingTicketIds={savingTicketIds}
              users={users}
              onOpen={openTicket}
              onQuickCreate={onQuickCreate}
            />
          ))}
        </div>
        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: "cubic-bezier(0.2, 0, 0, 1)"
          }}
        >
          {activeTicket ? (
            <div className="w-[264px] rotate-[0.5deg]">
              <KanbanCardContent ticket={activeTicket} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mx-auto flex max-w-[1440px] items-center justify-between border-t border-[var(--border)] px-3 py-2.5 text-[11px] text-[var(--text-faint)] sm:px-6 lg:px-8">
        <span>
          {filteredTickets.length} of {tickets.length} tickets
        </span>
        <span>Drag cards between columns to update status</span>
      </div>
    </div>
  )
}

function KanbanColumn({
  onOpen,
  onQuickCreate,
  savingTicketIds,
  selectedId,
  status,
  tickets,
  users
}: {
  onOpen: (ticketId: string) => void
  onQuickCreate: (input: {
    assignee: User | null
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }) => void
  savingTicketIds: Record<string, boolean>
  selectedId: string | null
  status: Status
  tickets: Ticket[]
  users: User[]
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  return (
    <section className="flex max-h-[calc(100vh-232px)] min-w-[280px] max-w-[280px] flex-col overflow-hidden rounded-[18px] border border-[#E5E1DA] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_rgba(16,24,40,0.04)]">
      <header className="sticky top-0 z-[2] flex h-11 items-center justify-between border-b border-[#E5E1DA] bg-[#F3F1EC] px-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <StatusIcon status={status} size={14} />
          <span className="truncate text-[11px] font-[650] uppercase tracking-[0.06em] text-[#5E6470]">
            {STATUS_LABELS[status]}
          </span>
          <span className="rounded-full border border-[#E3E0D8] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--text-muted)]">
            {tickets.length}
          </span>
        </span>
      </header>

      {quickCreateOpen ? (
        <QuickCreateCard
          status={status}
          users={users}
          onCancel={() => setQuickCreateOpen(false)}
          onCreate={(input) => {
            onQuickCreate(input)
            setQuickCreateOpen(false)
          }}
        />
      ) : null}

      <SortableContext
        id={status}
        items={tickets.map((ticket) => ticket.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-2 overflow-y-auto p-2.5 transition-colors",
            isOver && "bg-[var(--accent-soft)]"
          )}
        >
          {tickets.length === 0 ? (
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E3E0D8] text-[12px] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
            >
              <SquareDashed size={16} />
              Add ticket
            </button>
          ) : (
            <>
              {tickets.map((ticket) => (
                <KanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  selected={ticket.id === selectedId}
                  saving={savingTicketIds[ticket.id] === true}
                  onOpen={onOpen}
                />
              ))}
              <button
                type="button"
                onClick={() => setQuickCreateOpen(true)}
                className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E3E0D8] text-[11px] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
              >
                <SquareDashed size={13} />
                Add ticket
              </button>
            </>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function KanbanCard({
  onOpen,
  saving,
  selected,
  ticket
}: {
  onOpen: (ticketId: string) => void
  saving?: boolean
  selected: boolean
  ticket: Ticket
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(ticket.id)}
      className={cn(
        "touch-none text-left transition-[opacity,transform] duration-[120ms]",
        selected && "border-[color-mix(in_srgb,var(--accent)_42%,var(--border))]",
        isDragging && "opacity-25"
      )}
    >
      <KanbanCardContent ticket={ticket} selected={selected} saving={saving} />
    </article>
  )
}

function KanbanCardContent({
  dragging,
  saving,
  selected,
  ticket
}: {
  dragging?: boolean
  saving?: boolean
  selected?: boolean
  ticket: Ticket
}) {
  const overdue = isOverdue(ticket)
  const blocked = ticket.status === "blocked" || Boolean(ticket.blockerReason)

  return (
    <div
      className={cn(
        "group rounded-xl border border-[#E5E1DA] bg-[var(--surface)] p-3 transition-[background-color,border-color,box-shadow] duration-[120ms] hover:border-[var(--border-strong)] hover:bg-[#FAF9F6] hover:shadow-[0_2px_8px_rgba(16,24,40,0.06)]",
        selected && "border-[var(--accent)] bg-[var(--accent-soft)]",
        blocked && "border-[color-mix(in_srgb,var(--status-blocked)_34%,#E5E1DA)]",
        dragging && "border-[var(--accent)] bg-[var(--surface)] shadow-[0_8px_32px_rgba(16,24,40,0.14)] rotate-[0.5deg]"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <WorkTypeCell workType={ticket.workType} />
          <span className="font-mono text-[11px] font-medium text-[var(--text-faint)]">
            #{ticket.id.replace(/^SIRP-/i, "")}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          {saving ? (
            <Loader2 size={12} className="animate-spin text-[var(--text-faint)]" />
          ) : null}
          <PriorityCell priority={ticket.priority} />
        </span>
      </div>

      <h3 className="line-clamp-2 text-[13px] font-medium leading-5 text-[var(--text)]">
        {ticket.title}
      </h3>

      {blocked ? (
        <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border-[0.5px] border-[color-mix(in_srgb,var(--status-blocked)_34%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_9%,transparent)] px-1.5 py-1 text-[11px] font-medium text-[color-mix(in_srgb,var(--status-blocked)_88%,var(--text))]">
          <AlertOctagon size={12} />
          <span className="truncate">{ticket.blockerReason ?? "Blocked"}</span>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#EEEAE3] pt-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar user={ticket.assignee} size={22} />
          <span className="truncate text-[11px] text-[var(--text-muted)]">
            {ticket.assignee?.name ?? "Unassigned"}
          </span>
        </span>
        {ticket.dueDate ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[11px]",
              overdue
                ? "bg-[color-mix(in_srgb,var(--status-blocked)_10%,transparent)] text-[color-mix(in_srgb,var(--status-blocked)_90%,var(--text))]"
                : "text-[var(--text-faint)]"
            )}
          >
            <CalendarDays size={12} />
            {formatDueDate(ticket.dueDate)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function QuickCreateCard({
  onCancel,
  onCreate,
  status,
  users
}: {
  onCancel: () => void
  onCreate: (input: {
    assignee: User | null
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }) => void
  status: Status
  users: User[]
}) {
  const [assigneeId, setAssigneeId] = useState("unassigned")
  const [priority, setPriority] = useState<Priority>("medium")
  const [title, setTitle] = useState("")
  const [workType, setWorkType] = useState<WorkType>("task")
  const [error, setError] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setError(true)
      return
    }

    onCreate({
      assignee: users.find((user) => user.id === assigneeId) ?? null,
      priority,
      status,
      title: cleanTitle,
      workType
    })
  }

  return (
    <form
      onSubmit={submit}
      className="m-2.5 mb-0 rounded-xl border border-[#E5E1DA] bg-[var(--surface)] p-2.5 shadow-[0_1px_4px_rgba(16,24,40,0.04)]"
    >
      <input
        autoFocus
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setError(false)
        }}
        placeholder="Ticket title"
        className={cn(
          "h-9 w-full rounded-lg border bg-[var(--surface-2)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none",
          error ? "border-[var(--status-blocked)]" : "border-[#E3E0D8]"
        )}
      />

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <QuickSelect
          value={workType}
          onChange={(value) => setWorkType(value as WorkType)}
        >
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="enhancement">Enhancement</option>
        </QuickSelect>
        <QuickSelect
          value={priority}
          onChange={(value) => setPriority(value as Priority)}
        >
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </QuickSelect>
      </div>

      <QuickSelect
        className="mt-1.5"
        value={assigneeId}
        onChange={setAssigneeId}
      >
        <option value="unassigned">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </QuickSelect>

      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-8 rounded-lg bg-[#111827] px-2.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(17,24,39,0.12)] transition-colors hover:bg-[#1f2937]"
        >
          Add
        </button>
      </div>
    </form>
  )
}

function QuickSelect({
  children,
  className,
  onChange,
  value
}: {
  children: ReactNode
  className?: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-8 min-w-0 rounded-lg border border-[#E3E0D8] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text-muted)] focus-visible:focus-input focus-visible:outline-none",
        className
      )}
    >
      {children}
    </select>
  )
}

function KanbanFilterList({
  items,
  value,
  onSelect
}: {
  items: Array<{ value: string; label: string; leading?: React.ReactNode }>
  value: string | null
  onSelect: (value: string) => void
}) {
  return (
    <div className="max-h-[280px] overflow-y-auto">
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors",
              active ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            )}
          >
            {item.leading && <span className="shrink-0">{item.leading}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {active && <Check size={13} className="text-[var(--accent)]" />}
          </button>
        )
      })}
    </div>
  )
}

function isOverdue(ticket: Ticket) {
  if (!ticket.dueDate || ticket.status === "done") {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${ticket.dueDate}T00:00:00`) < today
}
