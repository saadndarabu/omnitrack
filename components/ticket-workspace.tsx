"use client"

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
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

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

type SavedViewId = "all" | "my" | "team-active"

type SavedView = {
  id: SavedViewId
  label: string
  filter: (ticket: Ticket, currentUserId: string) => boolean
}

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "All tickets", filter: () => true },
  { id: "my", label: "My tickets", filter: (t, uid) => t.assignee?.id === uid },
  { id: "team-active", label: "Active", filter: (t) => t.status === "in_progress" || t.status === "in_review" },
]

function sortMyTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    // 1. Blocked first
    const aBlocked = a.status === "blocked" ? 0 : 1
    const bBlocked = b.status === "blocked" ? 0 : 1
    if (aBlocked !== bBlocked) return aBlocked - bBlocked
    // 2. Due date ascending (no due date goes last)
    const aDue = a.dueDate ?? "9999-12-31"
    const bDue = b.dueDate ?? "9999-12-31"
    if (aDue !== bDue) return aDue < bDue ? -1 : 1
    // 3. Priority
    const aPri = PRIORITY_RANK[a.priority] ?? 99
    const bPri = PRIORITY_RANK[b.priority] ?? 99
    if (aPri !== bPri) return aPri - bPri
    // 4. Most recently updated
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function TicketWorkspace({
  activeTicketId,
  attachmentCounts = {},
  currentUser,
  initialTickets,
  users,
  view = "all"
}: {
  activeTicketId?: string
  attachmentCounts?: Record<string, number>
  currentUser: User
  initialTickets: Ticket[]
  users: User[]
  view?: "all" | "my"
}) {
  const [tickets, setTickets] = useState(() =>
    view === "my" ? sortMyTickets(initialTickets) : initialTickets
  )
  const [selectedId, setSelectedId] = useState<string | null>(activeTicketId ?? null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [assignTicketId, setAssignTicketId] = useState<string | null>(null)
  const [blockTicketId, setBlockTicketId] = useState<string | null>(null)
  const [modalStack, setModalStack] = useState<string[]>(activeTicketId ? [activeTicketId] : [])
  const [editingTitleTicketId, setEditingTitleTicketId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<TicketViewMode>("table")
  const [savedViewId, setSavedViewId] = useState<SavedViewId>(view === "my" ? "my" : "all")
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [globalFilter, setGlobalFilter] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const savedViewDef = SAVED_VIEWS.find((v) => v.id === savedViewId) ?? SAVED_VIEWS[0]
  const visibleTickets = useMemo(
    () => tickets.filter((t) => savedViewDef.filter(t, currentUser.id)),
    [tickets, savedViewDef, currentUser.id]
  )

  const visibleTicketIds = useMemo(
    () => visibleTickets.map((ticket) => ticket.id),
    [visibleTickets]
  )
  const modalTicketId = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null
  const modalParentId = modalStack.length > 1 ? modalStack[modalStack.length - 2] : null

  function findTicket(id: string) {
    return (
      tickets.find((t) => t.id.toLowerCase() === id.toLowerCase()) ??
      tickets.flatMap((t) => t.subtasks).find((s) => s.id.toLowerCase() === id.toLowerCase()) ??
      null
    )
  }

  const modalTicket = modalTicketId ? findTicket(modalTicketId) : null
  const modalParent = modalParentId ? findTicket(modalParentId) : null

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
    setEditingTitleTicketId(null)
    if (modalStack.length > 1) {
      const parentId = modalStack[modalStack.length - 2]
      setModalStack((s) => s.slice(0, -1))
      window.history.replaceState(null, "", `/t/${parentId}`)
    } else {
      setModalStack([])
      window.history.replaceState(null, "", "/tickets")
    }
  }

  function openTicket(ticketId: string) {
    setSelectedId(ticketId)
    setModalStack((s) => {
      // If already open at top of stack, do nothing
      if (s.length > 0 && s[s.length - 1] === ticketId) return s
      // If it's a top-level ticket opening fresh (not from within a modal), reset stack
      if (s.length === 0) return [ticketId]
      // Otherwise push (navigating from parent → subtask)
      return [...s, ticketId]
    })
    window.history.replaceState(null, "", `/t/${ticketId}`)
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
      currentTickets.map((ticket) => {
        if (ticket.id === ticketId) return patcher(ticket)
        // Also patch within subtasks
        const patchedSubtasks = ticket.subtasks.map((s) =>
          s.id === ticketId ? patcher(s) : s
        )
        if (patchedSubtasks !== ticket.subtasks && patchedSubtasks.some((s, i) => s !== ticket.subtasks[i])) {
          return { ...ticket, subtasks: patchedSubtasks }
        }
        return ticket
      })
    )
  }

  function addChildToParent(parentId: string, child: Ticket) {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === parentId
          ? { ...ticket, workType: "epic", subtasks: [...ticket.subtasks, child] }
          : ticket
      )
    )
  }

  function removeChildFromParent(parentId: string, childId: string) {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) => {
        if (ticket.id !== parentId) return ticket
        const remaining = ticket.subtasks.filter((s) => s.id !== childId)
        return {
          ...ticket,
          subtasks: remaining,
          workType: remaining.length === 0 ? "task" : ticket.workType
        }
      })
    )
  }

  async function createChild(
    parentId: string,
    input: Parameters<typeof createTicket>[0]
  ) {
    const parentTicket = tickets.find((t) => t.id === parentId)
    if (!parentTicket) return

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:               input.title,
        description:         input.description,
        workType:            input.workType,
        status:              input.status,
        priority:            input.priority,
        project:             "platform",
        area:                input.area,
        component:           input.component,
        estimate:            input.estimate,
        dueDate:             input.dueDate,
        acceptanceCriteria:  input.acceptanceCriteria,
        labels:              input.labels,
        assigneeId:          input.assignee?.id ?? null,
        parentId
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error("createChild failed", err)
      return
    }

    const child: Ticket = await res.json()
    addChildToParent(parentId, child)

    await fetch(`/api/tickets/${child.id}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId:  currentUser.id,
        field:    "created",
        oldValue: null,
        newValue: child.title
      })
    }).catch(() => {})

    return child
  }

  async function changeParent(ticketId: string, newParentId: string | null) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const oldParentId = ticket.parentId

    // Optimistically update local state
    if (oldParentId) {
      removeChildFromParent(oldParentId, ticketId)
    }

    if (newParentId) {
      // Move ticket to be a top-level entry briefly, then add as child
      setTickets((current) =>
        current
          .filter((t) => t.id !== ticketId)
          .map((t) =>
            t.id === newParentId
              ? { ...t, workType: "epic", subtasks: [...t.subtasks, { ...ticket, parentId: newParentId }] }
              : t
          )
      )
    } else {
      // Remove from children, add back as top-level ticket
      setTickets((current) => [
        { ...ticket, parentId: null },
        ...current.filter((t) => t.id !== ticketId)
      ])
    }

    await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: newParentId })
    }).catch(() => {})
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
      parentId: null,
      subtasks: [],
      fbApproved: false,
      createdAt: now,
      updatedAt: now,
      comments: []
    }

    setTickets((currentTickets) => [ticket, ...currentTickets])
    setSelectedId(id)
    if (options.openDetail !== false) {
      openTicket(id)
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
        searchRef.current?.focus()
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
          setModalStack((s) => (s.includes(ticketId) ? s : [...s, ticketId]))
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
    modalStack,
    selectedId,
    tickets,
    visibleTickets
  ])

  return (
    <div
      className={cn(
        "min-h-screen text-[var(--text)] transition-[padding-left] duration-200 ease-out",
        sidebarExpanded ? "md:pl-[224px]" : "md:pl-[64px]"
      )}
    >
      <Sidebar
        current={view === "my" ? "My Tickets" : "All Tickets"}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur">
          <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
            {/* Saved view tabs */}
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {view === "my" ? "My tickets" : "Tickets"}
              </h1>
              <span aria-hidden className="h-4 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-0.5">
                {SAVED_VIEWS.map((sv) => {
                  const active = sv.id === savedViewId
                  return (
                    <button
                      key={sv.id}
                      type="button"
                      onClick={() => setSavedViewId(sv.id)}
                      className={cn(
                        "inline-flex h-7 items-center rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors whitespace-nowrap",
                        active
                          ? "bg-[var(--surface-2)] text-[var(--text)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      )}
                    >
                      {sv.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative hidden sm:flex items-center">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setGlobalFilter(""), e.currentTarget.blur())}
                  placeholder="Search…"
                  aria-label="Search tickets"
                  className="h-7 w-[200px] rounded-[6px] border border-[var(--border)] bg-[var(--surface)] pl-7 pr-3 text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-faint)] transition-colors focus:w-[260px] focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border-strong))] focus:outline-none"
                />
                {globalFilter ? (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter("")}
                    aria-label="Clear search"
                    className="absolute right-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
                  >
                    <X size={11} />
                  </button>
                ) : null}
              </div>
              <IconButton label="Keyboard shortcuts" onClick={() => setHelpOpen(true)} size="sm">
                <HelpCircle size={15} />
              </IconButton>
              <NotificationBell userId={currentUser.id} />
              <Button variant="primary" size="sm" onClick={() => setComposerOpen(true)}>
                <Plus size={13} />
                <span className="hidden sm:inline">New ticket</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-col">
          {viewMode === "table" ? (
            <TicketTable
              tickets={visibleTickets}
              selectedId={selectedId}
              users={users}
              attachmentCounts={attachmentCounts}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onOpen={openTicket}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          ) : (
            <TicketKanban
              tickets={visibleTickets}
              selectedId={selectedId}
              users={users}
              globalFilter={globalFilter}
              onOpen={openTicket}
              onQuickCreate={quickCreateTicket}
              onStatusChange={requestKanbanStatusChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
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
          key={modalTicket.id}
          ticket={modalTicket}
          parentTicket={modalParent}
          tickets={tickets}
          users={users}
          currentUser={currentUser}
          onAssigneeChange={(user) => updateTicket(modalTicket.id, { assignee: user })}
          onBack={modalParent ? closeModal : undefined}
          onClose={closeModal}
          onStatusChange={(status) => requestStatusChange(modalTicket.id, status)}
          onTitleChange={(title) => updateTitle(modalTicket.id, title)}
          onUpdate={(patch) => updateTicket(modalTicket.id, patch)}
          onChildCreate={(input) => createChild(modalTicket.id, input)}
          onChildUpdate={(childId, patch) => updateTicket(childId, patch)}
          onChildDelete={(childId) => {
            fetch(`/api/tickets/${childId}`, { method: "DELETE" }).catch(() => {})
            if (modalTicket.id) removeChildFromParent(modalTicket.id, childId)
          }}
          onChildOpen={openTicket}
          onParentChange={(newParentId) => changeParent(modalTicket.id, newParentId)}
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

  const titleNode = (
    <div className="flex min-w-0 items-center gap-2">
      <input
        aria-label="Ticket title"
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="New ticket title…"
        autoFocus={mode === "manual"}
        className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
      />
    </div>
  )

  return (
    <ModalFrame
      title={titleNode}
      headerActions={
        <div className="flex gap-1 mr-1">
          {(["manual", "ai"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                mode === m
                  ? "bg-[var(--surface-2)] text-[var(--text)]"
                  : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
              )}
            >
              {m === "manual" ? "Manual" : "Ask AI"}
            </button>
          ))}
        </div>
      }
      onClose={onClose}
      className="max-w-[980px]"
    >
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
        <form onSubmit={submit}>
          {draft.title && aiPrompt ? (
            <div className="flex items-center gap-2 border-b-[0.5px] border-[var(--border)] px-4 py-2">
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

          <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Main content */}
            <section className="min-w-0 space-y-5 border-b-[0.5px] border-[var(--border)] p-4 lg:border-b-0 lg:border-r-[0.5px]">
              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-[var(--text-faint)]">Description</span>
                <div className="rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)] px-3 py-2.5">
                  <textarea
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="Add description"
                    className="w-full resize-none bg-transparent text-[13px] leading-6 text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)] hover:text-[var(--text)] focus:text-[var(--text)]"
                    style={{ minHeight: "5rem" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-[var(--text-faint)]">Acceptance criteria</span>
                <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)]">
                  {draft.acceptanceCriteria.length > 0 && (
                    <div className="divide-y divide-[var(--border)]">
                      {draft.acceptanceCriteria.map((criterion, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[20px_minmax(0,1fr)_24px] items-center gap-2 px-3 py-2"
                        >
                          <span className="h-3.5 w-3.5 rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)]" />
                          <input
                            value={criterion}
                            onChange={(e) => {
                              const next = draft.acceptanceCriteria.slice()
                              next[index] = e.target.value
                              patch({ acceptanceCriteria: next })
                            }}
                            placeholder="Acceptance criterion"
                            className="min-w-0 bg-transparent text-[13px] text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)] focus:text-[var(--text)]"
                          />
                          <button
                            type="button"
                            onClick={() => patch({ acceptanceCriteria: draft.acceptanceCriteria.filter((_, i) => i !== index) })}
                            aria-label="Remove criterion"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={cn("px-2 py-1.5", draft.acceptanceCriteria.length > 0 && "border-t-[0.5px] border-[var(--border)]")}>
                    <button
                      type="button"
                      onClick={() => patch({ acceptanceCriteria: [...draft.acceptanceCriteria, ""] })}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    >
                      <Plus size={11} />
                      Add criterion
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-[var(--text-faint)]">Labels</span>
                <Input
                  value={draft.labelText}
                  onChange={(e) => patch({ labelText: e.target.value })}
                  placeholder="github, state, filters"
                />
              </div>
            </section>

            {/* Properties sidebar */}
            <aside className="p-4">
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[8px] border border-[var(--border)]">
                <ComposerPropRow label="Status">
                  <ComposerSelect value={draft.status} onChange={(v) => patch({ status: v as Status })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Priority">
                  <ComposerSelect value={draft.priority} onChange={(v) => patch({ priority: v as Priority })}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Work type">
                  <ComposerSelect value={draft.workType} onChange={(v) => patch({ workType: v as WorkType })}>
                    <option value="feature">Feature</option>
                    <option value="enhancement">Enhancement</option>
                    <option value="bug">Bug</option>
                    <option value="task">Task</option>
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Assignee">
                  <ComposerSelect value={draft.ownerId} onChange={(v) => patch({ ownerId: v })}>
                    <option value="unassigned">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Area">
                  <ComposerSelect value={draft.area} onChange={(v) => patch({ area: v as Area })}>
                    <option value="platform">Platform</option>
                    <option value="product">Product</option>
                    <option value="integrations">Integrations</option>
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Component">
                  <ComposerSelect value={draft.component} onChange={(v) => patch({ component: v as Component })}>
                    <option value="tickets">Tickets</option>
                    <option value="github">GitHub</option>
                    <option value="routing">Routing</option>
                    <option value="filters">Filters</option>
                    <option value="state">State</option>
                  </ComposerSelect>
                </ComposerPropRow>

                <ComposerPropRow label="Estimate">
                  <input
                    value={draft.estimate}
                    onChange={(e) => patch({ estimate: e.target.value })}
                    placeholder="—"
                    className="h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"
                  />
                </ComposerPropRow>

                <ComposerPropRow label="Due date">
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => patch({ dueDate: e.target.value })}
                    className="h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"
                  />
                </ComposerPropRow>

                <ComposerPropRow label="Blocker">
                  <input
                    value={draft.blockerReason}
                    onChange={(e) => patch({ blockerReason: e.target.value })}
                    placeholder="—"
                    className="h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"
                  />
                </ComposerPropRow>
              </div>
            </aside>
          </div>

          <div className="flex justify-end gap-2 border-t-[0.5px] border-[var(--border)] px-4 py-3">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="quiet">Create ticket</Button>
          </div>
        </form>
      )}
    </ModalFrame>
  )
}

function ComposerPropRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]">
      <span className="text-[11px] font-medium text-[var(--text-faint)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  )
}

function ComposerSelect({
  children,
  onChange,
  value
}: {
  children: ReactNode
  onChange: (value: string) => void
  value: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"
    >
      {children}
    </select>
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
