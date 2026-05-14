"use client"

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, HelpCircle, Plus, Search, X } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { CommandMenu } from "@/components/command-menu"
import { ModalFrame } from "@/components/modal-frame"
import { NotificationBell } from "@/components/notification-bell"
import { Sidebar } from "@/components/sidebar"
import { TicketKanban } from "@/components/ticket-kanban"
import { TicketTable } from "@/components/ticket-table"
import { TicketDetail } from "@/components/ticket-detail"
import { TicketViewSwitcher, type TicketViewMode } from "@/components/ticket-view-switcher"
import { Button, IconButton } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { nextTicketId, toBranchName } from "@/lib/ids"
import {
  canTransition,
  STATUS_LABELS,
  STATUS_SHORTCUTS,
  STATUSES,
  type Status
} from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Area, Component, Priority, Ticket, WorkType } from "@/types/ticket"
import type { User } from "@/types/user"

const shortcutRows = [
  ["c", "New ticket"],
  ["Cmd/Ctrl + K", "Command menu"],
  ["/", "Search"],
  ["j / k", "Move selection"],
  ["Enter", "Open selected ticket"],
  ["Esc", "Close modal or clear selection"],
  ["1-5", "Set status"],
  ["a", "Assign"],
  ["r", "Reopen"],
  ["e", "Edit title"]
] as const

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function TicketWorkspace({
  activeTicketId,
  currentUser,
  initialTickets,
  users
}: {
  activeTicketId?: string
  currentUser: User
  initialTickets: Ticket[]
  users: User[]
}) {
  const router = useRouter()
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedId, setSelectedId] = useState<string | null>(activeTicketId ?? null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [assignTicketId, setAssignTicketId] = useState<string | null>(null)
  const [blockTicketId, setBlockTicketId] = useState<string | null>(null)
  const [localModalTicketId, setLocalModalTicketId] = useState<string | null>(null)
  const [editingTitleTicketId, setEditingTitleTicketId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<TicketViewMode>("table")
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const initialTicketIds = useMemo(
    () => new Set(initialTickets.map((ticket) => ticket.id)),
    [initialTickets]
  )

  const visibleTickets = tickets

  const visibleTicketIds = useMemo(
    () => visibleTickets.map((ticket) => ticket.id),
    [visibleTickets]
  )
  const modalTicketId = activeTicketId ?? localModalTicketId
  const modalTicket =
    tickets.find((ticket) => ticket.id.toLowerCase() === modalTicketId?.toLowerCase()) ??
    null

  useEffect(() => {
    if (activeTicketId) {
      setSelectedId(activeTicketId)
      setLocalModalTicketId(null)
    }
  }, [activeTicketId])

  useEffect(() => {
    if (visibleTicketIds.length === 0) {
      setSelectedId(null)
      return
    }

    if (selectedId && !visibleTicketIds.includes(selectedId)) {
      setSelectedId(null)
    }
  }, [selectedId, visibleTicketIds])

  function closeModal() {
    setLocalModalTicketId(null)
    setEditingTitleTicketId(null)

    if (activeTicketId) {
      router.push("/tickets")
    }
  }

  function openTicket(ticketId: string) {
    setSelectedId(ticketId)

    if (initialTicketIds.has(ticketId)) {
      router.push(`/t/${ticketId}`)
      return
    }

    setLocalModalTicketId(ticketId)
  }

  function moveSelection(delta: number) {
    if (visibleTickets.length === 0) {
      return
    }

    const currentIndex = selectedId
      ? Math.max(
          0,
          visibleTickets.findIndex((ticket) => ticket.id === selectedId)
        )
      : 0
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), visibleTickets.length - 1)
    setSelectedId(visibleTickets[nextIndex].id)
  }

  function patchTicket(ticketId: string, patcher: (ticket: Ticket) => Ticket) {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) => (ticket.id === ticketId ? patcher(ticket) : ticket))
    )
  }

  function recordHistory(ticketId: string, field: string, oldValue: string | null, newValue: string | null) {
    fetch(`/api/tickets/${ticketId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: currentUser.id, field, oldValue, newValue })
    }).catch(() => {})
  }

  function sendNotification(userId: string, type: "assigned" | "mentioned" | "due_soon" | "comment_added", ticketId: string, message: string) {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type, ticketId, actorId: currentUser.id, message })
    }).catch(() => {})
  }

  const persistTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const persistTicket = useCallback((ticketId: string, patch: Record<string, unknown>) => {
    clearTimeout(persistTimers.current[ticketId])
    persistTimers.current[ticketId] = setTimeout(() => {
      fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      }).catch(() => {})
    }, 600)
  }, [])

  function applyStatusChange(ticketId: string, status: Status, blockReason?: string) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      recordHistory(ticketId, "status", ticket.status, status)
      persistTicket(ticketId, { status, ...(blockReason ? { blockerReason: blockReason } : {}) })
      if (blockReason && ticket.assignee && ticket.assignee.id !== currentUser.id) {
        sendNotification(
          ticket.assignee.id,
          "comment_added",
          ticketId,
          `${currentUser.name} added a blocker comment on ${ticketId}: "${blockReason}"`
        )
      }
    }

    patchTicket(ticketId, (ticket) => {
      if (ticket.status === status) {
        return ticket
      }

      if (!canTransition(ticket.status, status)) {
        return ticket
      }

      const now = new Date().toISOString()
      const branch =
        status === "in_progress" && !ticket.branch
          ? toBranchName("task", ticket.id, ticket.title)
          : ticket.branch
      const comments =
        status === "blocked" && blockReason
          ? [
              ...ticket.comments,
              {
                id: `comment_${ticket.id}_${Date.now()}`,
                author: currentUser,
                body: blockReason,
                createdAt: now
              }
            ]
          : ticket.comments

      return {
        ...ticket,
        blockerReason: status === "blocked" ? blockReason ?? ticket.blockerReason : ticket.blockerReason,
        branch,
        comments,
        status,
        updatedAt: now
      }
    })
  }

  function requestStatusChange(ticketId: string | null, status: Status) {
    if (!ticketId) {
      return
    }

    const ticket = tickets.find((candidate) => candidate.id === ticketId)

    if (!ticket || ticket.status === status) {
      return
    }

    if (!canTransition(ticket.status, status)) {
      return
    }

    if (status === "blocked") {
      setBlockTicketId(ticketId)
      return
    }

    applyStatusChange(ticketId, status)
  }

  function requestKanbanStatusChange(ticketId: string, status: Status) {
    const ticket = tickets.find((candidate) => candidate.id === ticketId)

    if (!ticket || ticket.status === status || !canTransition(ticket.status, status)) {
      return false
    }

    if (status === "blocked") {
      setBlockTicketId(ticketId)
      return false
    }

    applyStatusChange(ticketId, status)
    return true
  }

  function createTicket(input: {
    acceptanceCriteria: string[]
    area: Area
    assignee: User | null
    blockerReason: string | null
    component: Component
    description: string
    dueDate: string | null
    estimate: string | null
    labels: string[]
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }, options: { openDetail?: boolean } = {}) {
    const now = new Date().toISOString()
    const id = nextTicketId(tickets.map((ticket) => ticket.id))
    const ticket: Ticket = {
      id,
      title: input.title,
      description: input.description || "No description",
      workType: input.workType,
      status: input.status,
      priority: input.priority,
      project: "platform",
      area: input.area,
      component: input.component,
      estimate: input.estimate,
      dueDate: input.dueDate,
      acceptanceCriteria: input.acceptanceCriteria,
      blockerReason: input.blockerReason,
      labels: input.labels,
      branch: null,
      prNumber: null,
      assignee: input.assignee,
      createdAt: now,
      updatedAt: now,
      comments: []
    }

    setTickets((currentTickets) => [ticket, ...currentTickets])
    setSelectedId(id)
    if (options.openDetail !== false) {
      setLocalModalTicketId(id)
    }
    setComposerOpen(false)

    // Persist to DB and record creation history
    fetch(`/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title:               ticket.title,
        description:         ticket.description,
        workType:            ticket.workType,
        status:              ticket.status,
        priority:            ticket.priority,
        project:             ticket.project,
        area:                ticket.area,
        component:           ticket.component,
        estimate:            ticket.estimate,
        dueDate:             ticket.dueDate,
        acceptanceCriteria:  ticket.acceptanceCriteria,
        labels:              ticket.labels,
        assigneeId:          ticket.assignee?.id ?? null
      })
    })
      .then(() =>
        fetch(`/api/tickets/${id}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId:  currentUser.id,
            field:    "created",
            oldValue: null,
            newValue: ticket.title
          })
        })
      )
      .catch(() => {})
  }

  function quickCreateTicket(input: {
    assignee: User | null
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }) {
    createTicket(
      {
        acceptanceCriteria: [],
        area: "platform",
        assignee: input.assignee,
        blockerReason: null,
        component: "tickets",
        description: "",
        dueDate: null,
        estimate: null,
        labels: [],
        priority: input.priority,
        status: input.status,
        title: input.title,
        workType: input.workType
      },
      { openDetail: false }
    )
  }

  function assignTicket(ticketId: string, user: User | null) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      recordHistory(ticketId, "assignee", ticket.assignee?.name ?? null, user?.name ?? null)
      persistTicket(ticketId, { assigneeId: user?.id ?? null })
      if (user && user.id !== currentUser.id) {
        sendNotification(
          user.id,
          "assigned",
          ticketId,
          `${currentUser.name} assigned you to ${ticketId}: ${ticket.title}`
        )
      }
    }

    patchTicket(ticketId, (ticket) => ({
      ...ticket,
      assignee: user,
      updatedAt: new Date().toISOString()
    }))
    setAssignTicketId(null)
  }

  function updateTitle(ticketId: string, title: string) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket && ticket.title !== title) {
      recordHistory(ticketId, "title", ticket.title, title)
      persistTicket(ticketId, { title })
    }

    patchTicket(ticketId, (ticket) => ({
      ...ticket,
      title,
      branch: ticket.branch?.startsWith("task/")
        ? toBranchName("task", ticket.id, title)
        : ticket.branch,
      updatedAt: new Date().toISOString()
    }))
  }

  function updateTicket(ticketId: string, patch: Partial<Ticket>) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      const dbPatch: Record<string, unknown> = {}
      for (const key of Object.keys(patch) as Array<keyof Ticket>) {
        const oldRaw = ticket[key]
        const newRaw = patch[key]
        const oldVal = oldRaw == null ? null : String(oldRaw)
        const newVal = newRaw == null ? null : String(newRaw)
        if (oldVal !== newVal) {
          recordHistory(ticketId, key, oldVal, newVal)
        }
        // Map Ticket camelCase keys → UpdateTicketInput keys (same names except assignee)
        if (key === "assignee") {
          dbPatch.assigneeId = (newRaw as User | null)?.id ?? null
        } else {
          dbPatch[key] = newRaw
        }
      }
      persistTicket(ticketId, dbPatch)
    }

    patchTicket(ticketId, (ticket) => ({
      ...ticket,
      ...patch,
      updatedAt: new Date().toISOString()
    }))
  }

  // Fire due_soon notifications on load for tickets assigned to currentUser due within 2 days
  useEffect(() => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000
    const now = Date.now()
    for (const ticket of tickets) {
      if (
        ticket.dueDate &&
        ticket.assignee?.id === currentUser.id
      ) {
        const due = new Date(ticket.dueDate).getTime()
        if (due > now && due - now <= twoDaysMs) {
          sendNotification(
            currentUser.id,
            "due_soon",
            ticket.id,
            `${ticket.id} "${ticket.title}" is due on ${ticket.dueDate}`
          )
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = isTypingTarget(event.target)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
        return
      }

      if (typing) {
        return
      }

      if (event.key === "?") {
        event.preventDefault()
        setHelpOpen(true)
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()

        if (commandOpen) {
          setCommandOpen(false)
          return
        }

        if (composerOpen) {
          setComposerOpen(false)
          return
        }

        if (helpOpen) {
          setHelpOpen(false)
          return
        }

        if (assignTicketId) {
          setAssignTicketId(null)
          return
        }

        if (blockTicketId) {
          setBlockTicketId(null)
          return
        }

        if (modalTicketId) {
          closeModal()
          return
        }

        setSelectedId(null)
        return
      }

      if (event.key === "c") {
        event.preventDefault()
        setComposerOpen(true)
        return
      }

      if (event.key === "/") {
        event.preventDefault()
        setCommandOpen(true)
        return
      }

      if (event.key === "j") {
        event.preventDefault()
        moveSelection(1)
        return
      }

      if (event.key === "k") {
        event.preventDefault()
        moveSelection(-1)
        return
      }

      if (event.key === "Enter") {
        event.preventDefault()
        if (selectedId) {
          openTicket(selectedId)
        }
        return
      }

      if (event.key in STATUS_SHORTCUTS) {
        event.preventDefault()
        requestStatusChange(modalTicketId ?? selectedId, STATUS_SHORTCUTS[event.key as keyof typeof STATUS_SHORTCUTS])
        return
      }

      if (event.key === "a") {
        event.preventDefault()
        const ticketId = modalTicketId ?? selectedId
        if (ticketId) {
          setAssignTicketId(ticketId)
        }
        return
      }

      if (event.key === "r") {
        event.preventDefault()
        const ticketId = modalTicketId ?? selectedId
        const ticket = tickets.find((candidate) => candidate.id === ticketId)
        if (ticket?.status === "done") {
          requestStatusChange(ticket.id, "in_progress")
        }
        return
      }

      if (event.key === "e") {
        event.preventDefault()
        const ticketId = modalTicketId ?? selectedId
        if (ticketId) {
          setLocalModalTicketId(ticketId)
          setEditingTitleTicketId(ticketId)
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    assignTicketId,
    blockTicketId,
    commandOpen,
    composerOpen,
    helpOpen,
    modalTicketId,
    selectedId,
    tickets,
    visibleTickets
  ])

  return (
    <div
      className={cn(
        "min-h-screen text-[var(--text)] transition-[padding-left] duration-200 ease-out",
        sidebarExpanded ? "md:pl-[232px]" : "md:pl-[76px]"
      )}
    >
      <Sidebar
        current="Tasks"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-[var(--text)]">
                SIRP / All tickets
              </div>
              <div className="hidden truncate text-[12px] text-[var(--text-faint)] sm:block">
                {visibleTickets.length} visible of {tickets.length} total
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <TicketViewSwitcher value={viewMode} onChange={setViewMode} />
              <IconButton label="Search" onClick={() => setCommandOpen(true)}>
                <Search size={18} />
              </IconButton>
              <IconButton label="Keyboard shortcuts" onClick={() => setHelpOpen(true)}>
                <HelpCircle size={18} />
              </IconButton>
              <NotificationBell userId={currentUser.id} />
              <Button variant="primary" onClick={() => setComposerOpen(true)}>
                <Plus size={16} />
                <span className="hidden sm:inline">New ticket</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-col pt-6">
          {viewMode === "table" ? (
            <TicketTable
              tickets={tickets}
              selectedId={selectedId}
              users={users}
              onOpen={openTicket}
            />
          ) : (
            <TicketKanban
              tickets={tickets}
              selectedId={selectedId}
              users={users}
              onOpen={openTicket}
              onQuickCreate={quickCreateTicket}
              onStatusChange={requestKanbanStatusChange}
            />
          )}
        </main>
      </div>

      <CommandMenu
        open={commandOpen}
        tickets={tickets}
        onSelectTicket={openTicket}
        onOpenChange={setCommandOpen}
      />

      {modalTicket ? (
        <TicketDetail
          ticket={modalTicket}
          users={users}
          onAssigneeChange={(user) => updateTicket(modalTicket.id, { assignee: user })}
          onClose={closeModal}
          onStatusChange={(status) => requestStatusChange(modalTicket.id, status)}
          onTitleChange={(title) => updateTitle(modalTicket.id, title)}
          onUpdate={(patch) => updateTicket(modalTicket.id, patch)}
        />
      ) : null}

      {composerOpen ? (
        <NewTicketModal
          currentUser={currentUser}
          users={users}
          onClose={() => setComposerOpen(false)}
          onCreate={createTicket}
        />
      ) : null}

      {helpOpen ? <HelpModal onClose={() => setHelpOpen(false)} /> : null}

      {assignTicketId ? (
        <AssignModal
          users={users}
          ticket={tickets.find((ticket) => ticket.id === assignTicketId) ?? null}
          onAssign={(user) => assignTicket(assignTicketId, user)}
          onClose={() => setAssignTicketId(null)}
        />
      ) : null}

      {blockTicketId ? (
        <BlockModal
          onClose={() => setBlockTicketId(null)}
          onSubmit={(reason) => {
            applyStatusChange(blockTicketId, "blocked", reason)
            setBlockTicketId(null)
          }}
        />
      ) : null}
    </div>
  )
}

function CriteriaChecklist({
  items,
  onChange
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [newText, setNewText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const text = newText.trim()
    if (!text) return
    onChange([...items, text])
    setNewText("")
    inputRef.current?.focus()
  }

  function updateItem(index: number, value: string) {
    const next = items.slice()
    next[index] = value
    onChange(next)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={i} className="group flex items-start gap-2">
          <span className="mt-[5px] h-[14px] w-[14px] shrink-0 rounded-sm border-[0.5px] border-[var(--border)] bg-[var(--surface-2)]" />
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className="flex-1 rounded border-none bg-transparent py-0.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:bg-[color-mix(in_srgb,var(--surface-2)_50%,transparent)] focus:px-1.5"
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="mt-[3px] shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="h-[14px] w-[14px] shrink-0 rounded-sm border-[0.5px] border-dashed border-[var(--border)]" />
        <input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add criterion and press Enter"
          className="flex-1 rounded border-none bg-transparent py-0.5 text-[13px] text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)] focus:text-[var(--text)]"
        />
      </div>
    </div>
  )
}

type TicketDraft = {
  title: string
  description: string
  workType: WorkType
  status: Status
  priority: Priority
  area: Area
  component: Component
  estimate: string
  dueDate: string
  acceptanceCriteria: string[]
  blockerReason: string
  labelText: string
  ownerId: string
}

function NewTicketModal({
  currentUser,
  onClose,
  onCreate,
  users
}: {
  currentUser: User
  onClose: () => void
  onCreate: (input: {
    acceptanceCriteria: string[]
    area: Area
    assignee: User | null
    blockerReason: string | null
    component: Component
    description: string
    dueDate: string | null
    estimate: string | null
    labels: string[]
    priority: Priority
    status: Status
    title: string
    workType: WorkType
  }) => void
  users: User[]
}) {
  const [mode, setMode] = useState<"manual" | "ai">("manual")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [draft, setDraft] = useState<TicketDraft>({
    title: "",
    description: "",
    workType: "task",
    status: "todo",
    priority: "medium",
    area: "platform",
    component: "tickets",
    estimate: "",
    dueDate: "",
    acceptanceCriteria: [],
    blockerReason: "",
    labelText: "",
    ownerId: currentUser.id
  })

  function patch(partial: Partial<TicketDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  async function generateFromAI() {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res  = await fetch("/api/ai/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      patch({
        title:               data.title            ?? "",
        description:         data.description      ?? "",
        workType:            data.workType          ?? "task",
        status:              data.status            ?? "todo",
        priority:            data.priority          ?? "medium",
        area:                data.area              ?? "platform",
        component:           data.component         ?? "tickets",
        estimate:            data.estimate          ?? "",
        dueDate:             data.dueDate           ?? "",
        acceptanceCriteria:  Array.isArray(data.acceptanceCriteria) ? data.acceptanceCriteria : [],
        labelText:           Array.isArray(data.labels) ? data.labels.join(", ") : ""
      })
      setMode("manual")
    } catch {
      setAiError("Failed to generate ticket. Check your API key and try again.")
    } finally {
      setAiLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = draft.title.trim()
    if (!cleanTitle) return

    onCreate({
      acceptanceCriteria: draft.acceptanceCriteria.filter(Boolean),
      area:        draft.area,
      assignee:    users.find((u) => u.id === draft.ownerId) ?? null,
      blockerReason: draft.blockerReason.trim() || null,
      component:   draft.component,
      description: draft.description.trim(),
      dueDate:     draft.dueDate || null,
      estimate:    draft.estimate.trim() || null,
      labels:      draft.labelText
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6),
      priority:    draft.priority,
      status:      draft.status,
      title:       cleanTitle,
      workType:    draft.workType
    })
  }

  return (
    <ModalFrame title="New ticket" onClose={onClose} className="max-w-[760px]">
      {/* Mode toggle */}
      <div className="flex gap-1 border-b-[0.5px] border-[var(--border)] px-4 pt-3">
        {(["manual", "ai"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "-mb-px border-b-2 pb-2.5 px-1 text-[13px] font-medium transition-colors",
              mode === m
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-transparent text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            )}
          >
            {m === "manual" ? "Manual" : "Ask AI"}
          </button>
        ))}
      </div>

      {mode === "ai" ? (
        <div className="space-y-3 p-4">
          <p className="text-[12px] text-[var(--text-faint)]">
            Describe what needs to be done and AI will draft the ticket for you to review.
          </p>
          <Textarea
            autoFocus
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Add rate limiting to the OmniScan API endpoints to prevent abuse…"
            className="min-h-[120px]"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generateFromAI()
            }}
          />
          {aiError ? (
            <p className="text-[12px] text-[var(--status-blocked)]">{aiError}</p>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-faint)]">⌘ Enter to generate</span>
            <Button
              type="button"
              variant="primary"
              onClick={generateFromAI}
              disabled={!aiPrompt.trim() || aiLoading}
            >
              {aiLoading ? "Generating…" : "Generate ticket"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-4">
          {draft.title && mode === "manual" && aiPrompt ? (
            <div className="flex items-center gap-2 rounded-md border-[0.5px] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-2">
              <span className="text-[11px] text-[var(--accent)]">AI draft — review and edit before creating</span>
              <button
                type="button"
                onClick={() => { setMode("ai"); setAiPrompt("") }}
                className="ml-auto text-[11px] text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
              >
                Start over
              </button>
            </div>
          ) : null}

          <div className="rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_62%,transparent)]">
            <div className="border-b-[0.5px] border-[var(--border)] p-3">
              <Input
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Title"
                className="border-transparent bg-transparent px-0 text-[15px] font-medium focus-visible:outline-none"
              />
            </div>
            <div className="p-3">
              <Textarea
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Description"
                className="min-h-28 border-transparent bg-transparent px-0 py-0 leading-6 focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Work type">
              <NativeSelect value={draft.workType} onChange={(v) => patch({ workType: v as WorkType })}>
                <option value="feature">Feature</option>
                <option value="enhancement">Enhancement</option>
                <option value="bug">Bug</option>
                <option value="task">Task</option>
              </NativeSelect>
            </Field>
            <Field label="Status">
              <NativeSelect value={draft.status} onChange={(v) => patch({ status: v as Status })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priority">
              <NativeSelect value={draft.priority} onChange={(v) => patch({ priority: v as Priority })}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </NativeSelect>
            </Field>
            <Field label="Area">
              <NativeSelect value={draft.area} onChange={(v) => patch({ area: v as Area })}>
                <option value="platform">Platform</option>
                <option value="product">Product</option>
                <option value="integrations">Integrations</option>
              </NativeSelect>
            </Field>
            <Field label="Component">
              <NativeSelect value={draft.component} onChange={(v) => patch({ component: v as Component })}>
                <option value="tickets">Tickets</option>
                <option value="github">GitHub</option>
                <option value="routing">Routing</option>
                <option value="filters">Filters</option>
                <option value="state">State</option>
              </NativeSelect>
            </Field>
            <Field label="Owner">
              <NativeSelect value={draft.ownerId} onChange={(v) => patch({ ownerId: v })}>
                <option value="unassigned">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Estimate">
              <Input
                value={draft.estimate}
                onChange={(e) => patch({ estimate: e.target.value })}
                placeholder="3 pts"
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={draft.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Acceptance criteria">
            <CriteriaChecklist
              items={draft.acceptanceCriteria}
              onChange={(items) => patch({ acceptanceCriteria: items })}
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Blocker reason">
              <Textarea
                value={draft.blockerReason}
                onChange={(e) => patch({ blockerReason: e.target.value })}
                placeholder="Only needed when blocked"
                className="min-h-20"
              />
            </Field>
            <Field label="Labels">
              <Input
                value={draft.labelText}
                onChange={(e) => patch({ labelText: e.target.value })}
                placeholder="github, state, filters"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="quiet">Create ticket</Button>
          </div>
        </form>
      )}
    </ModalFrame>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-medium text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  )
}

function NativeSelect({
  children,
  onChange,
  value
}: {
  children: ReactNode
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full appearance-none rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface)] py-0 pl-3 pr-8 text-[13px] text-[var(--text)] outline-none focus-visible:focus-input"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
      />
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame title="Keyboard shortcuts" onClose={onClose} className="max-w-[520px]">
      <div className="divide-y-[0.5px] divide-[var(--border)] p-2">
        {shortcutRows.map(([key, action]) => (
          <div key={key} className="flex h-9 items-center justify-between rounded-md px-2">
            <span className="text-[13px] text-[var(--text-muted)]">{action}</span>
            <span className="font-mono text-[11px] text-[var(--text-faint)]">{key}</span>
          </div>
        ))}
      </div>
    </ModalFrame>
  )
}

function AssignModal({
  ticket,
  users,
  onAssign,
  onClose
}: {
  ticket: Ticket | null
  users: User[]
  onAssign: (user: User | null) => void
  onClose: () => void
}) {
  return (
    <ModalFrame title="Assign" onClose={onClose} className="max-w-[420px]">
      <div className="space-y-1 p-2">
        <button
          type="button"
          onClick={() => onAssign(null)}
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] text-[var(--text-muted)] transition-colors duration-[120ms] ease-out hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            !ticket?.assignee && "bg-[var(--surface-2)] text-[var(--text)]"
          )}
        >
          <Avatar user={null} />
          Unassigned
        </button>
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onAssign(user)}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-[13px] text-[var(--text-muted)] transition-colors duration-[120ms] ease-out hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
              ticket?.assignee?.id === user.id && "bg-[var(--surface-2)] text-[var(--text)]"
            )}
          >
            <Avatar user={user} />
            {user.name}
          </button>
        ))}
      </div>
    </ModalFrame>
  )
}

function BlockModal({
  onClose,
  onSubmit
}: {
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanReason = reason.trim()

    if (cleanReason) {
      onSubmit(cleanReason)
    }
  }

  return (
    <ModalFrame title="Block ticket" onClose={onClose} className="max-w-[520px]">
      <form onSubmit={submit} className="space-y-3 p-4">
        <Textarea
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="quiet">
            Block
          </Button>
        </div>
      </form>
    </ModalFrame>
  )
}
