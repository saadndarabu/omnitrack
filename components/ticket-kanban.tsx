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
import { AlertOctagon, CalendarDays, Loader2, Search, SquareDashed, X } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { StatusIcon } from "@/components/status-icon"
import {
  PriorityCell,
  WorkTypeCell,
  formatDueDate
} from "@/components/ticket-table-columns"
import { canTransition, STATUS_LABELS, STATUSES, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Priority, Ticket, WorkType } from "@/types/ticket"
import type { User } from "@/types/user"

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
  onOpen,
  onQuickCreate,
  onStatusChange,
  selectedId,
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
  onStatusChange: (ticketId: string, status: Status) => boolean | Promise<boolean>
  selectedId: string | null
  tickets: Ticket[]
  users: User[]
}) {
  const [search, setSearch] = useState("")
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
    const needle = search.trim().toLowerCase()
    if (!needle) {
      return tickets
    }

    return tickets.filter((ticket) =>
      [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.workType,
        ticket.priority,
        ticket.assignee?.name ?? "Unassigned",
        ticket.area,
        ticket.component,
        ...ticket.labels
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [search, tickets])

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

  return (
    <div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="relative flex h-8 min-w-0 max-w-[360px] flex-1 items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search board…"
            aria-label="Search board"
            className="h-8 w-full rounded-md border-[0.5px] border-[var(--border)] bg-[var(--bg)] pl-8 pr-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

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
        <div className="flex max-h-[calc(100vh-196px)] gap-2 overflow-x-auto px-3 py-2 sm:px-6 lg:px-8">
          {STATUSES.map((status) => (
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

      <div className="mx-auto flex max-w-[1440px] items-center justify-between border-t-[0.5px] border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-faint)] sm:px-6 lg:px-8">
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
    <section className="flex max-h-[calc(100vh-232px)] min-w-[280px] max-w-[280px] flex-col rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_64%,transparent)]">
      <header className="sticky top-0 z-[2] flex h-10 items-center justify-between border-b-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_54%,var(--bg))] px-2.5">
        <span className="inline-flex min-w-0 items-center gap-2">
          <StatusIcon status={status} size={14} />
          <span className="truncate text-[12px] font-semibold text-[var(--text)]">
            {STATUS_LABELS[status]}
          </span>
          <span className="rounded-full border-[0.5px] border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--text-muted)]">
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
            "flex flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
            isOver &&
              "bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          )}
        >
          {tickets.length === 0 ? (
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border-[0.5px] border-dashed border-[var(--border)] text-[12px] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
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
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border-[0.5px] border-dashed border-[var(--border)] text-[11px] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
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
        "group rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_84%,var(--bg))] p-2.5 transition-[background-color,border-color,box-shadow] duration-[120ms] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
        selected && "border-[color-mix(in_srgb,var(--accent)_42%,var(--border))]",
        blocked &&
          "border-[color-mix(in_srgb,var(--status-blocked)_34%,var(--border))]",
        dragging &&
          "border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--surface-2)] shadow-2xl shadow-black/30"
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

      <div className="mt-2 flex items-center justify-between gap-2 border-t-[0.5px] border-[var(--border)] pt-2">
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
      className="m-2 mb-0 rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_72%,var(--bg))] p-2"
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
          "h-8 w-full rounded-md border-[0.5px] bg-[var(--bg)] px-2 text-[12px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none",
          error ? "border-[var(--status-blocked)]" : "border-[var(--border)]"
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
          className="h-7 rounded-md px-2 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-7 rounded-md border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 text-[12px] font-semibold text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
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
        "h-7 min-w-0 rounded-md border-[0.5px] border-[var(--border)] bg-[var(--bg)] px-1.5 text-[11px] text-[var(--text-muted)] focus-visible:focus-input focus-visible:outline-none",
        className
      )}
    >
      {children}
    </select>
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
