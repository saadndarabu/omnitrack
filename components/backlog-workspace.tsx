"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Archive, Plus, Search, X } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { Sidebar } from "@/components/sidebar"
import { TicketDetail } from "@/components/ticket-detail"
import { TicketTable } from "@/components/ticket-table"
import { Button } from "@/components/ui/button"
import { canTransition, type Status } from "@/lib/status"
import { toBranchName } from "@/lib/ids"
import { cn } from "@/lib/utils"
import type { Ticket } from "@/types/ticket"
import type { User } from "@/types/user"

export function BacklogWorkspace({
  attachmentCounts = {},
  currentUser,
  initialTickets,
  users,
}: {
  attachmentCounts?: Record<string, number>
  currentUser: User
  initialTickets: Ticket[]
  users: User[]
}) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalStack, setModalStack] = useState<string[]>([])
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [globalFilter, setGlobalFilter] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const modalTicketId = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null
  const modalParentId = modalStack.length > 1 ? modalStack[modalStack.length - 2] : null

  function findTicket(id: string): Ticket | null {
    return (
      tickets.find((t) => t.id.toLowerCase() === id.toLowerCase()) ??
      tickets.flatMap((t) => t.subtasks).find((s) => s.id.toLowerCase() === id.toLowerCase()) ??
      null
    )
  }

  const modalTicket = modalTicketId ? findTicket(modalTicketId) : null
  const modalParent = modalParentId ? findTicket(modalParentId) : null

  function closeModal() {
    if (modalStack.length > 1) {
      const parentId = modalStack[modalStack.length - 2]
      setModalStack((s) => s.slice(0, -1))
      window.history.replaceState(null, "", `/t/${parentId}`)
    } else {
      setModalStack([])
      window.history.replaceState(null, "", "/backlog")
    }
  }

  function openTicket(ticketId: string) {
    setSelectedId(ticketId)
    setModalStack((s) => {
      if (s.length > 0 && s[s.length - 1] === ticketId) return s
      if (s.length === 0) return [ticketId]
      return [...s, ticketId]
    })
    window.history.replaceState(null, "", `/t/${ticketId}`)
  }

  function patchTicket(ticketId: string, patcher: (t: Ticket) => Ticket) {
    setTickets((current) =>
      current.map((t) => {
        if (t.id === ticketId) return patcher(t)
        const patchedSubs = t.subtasks.map((s) => (s.id === ticketId ? patcher(s) : s))
        if (patchedSubs.some((s, i) => s !== t.subtasks[i])) return { ...t, subtasks: patchedSubs }
        return t
      })
    )
  }

  const persistTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const persistTicket = useCallback((ticketId: string, patch: Record<string, unknown>) => {
    clearTimeout(persistTimers.current[ticketId])
    persistTimers.current[ticketId] = setTimeout(() => {
      fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {})
    }, 600)
  }, [])

  function recordHistory(ticketId: string, field: string, oldValue: string | null, newValue: string | null) {
    fetch(`/api/tickets/${ticketId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: currentUser.id, field, oldValue, newValue }),
    }).catch(() => {})
  }

  function applyStatusChange(ticketId: string, status: Status) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      recordHistory(ticketId, "status", ticket.status, status)
      persistTicket(ticketId, { status })
    }
    patchTicket(ticketId, (t) => {
      if (t.status === status || !canTransition(t.status, status)) return t
      const now = new Date().toISOString()
      const branch =
        status === "in_progress" && !t.branch
          ? toBranchName("task", t.id, t.title)
          : t.branch
      return { ...t, status, branch, updatedAt: now }
    })
  }

  function updateTicket(ticketId: string, patch: Partial<Ticket>) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) {
      const dbPatch: Record<string, unknown> = {}
      for (const key of Object.keys(patch) as Array<keyof Ticket>) {
        const oldVal = ticket[key] == null ? null : String(ticket[key])
        const newVal = patch[key] == null ? null : String(patch[key])
        if (oldVal !== newVal) recordHistory(ticketId, key, oldVal, newVal)
        if (key === "assignee") {
          dbPatch.assigneeId = (patch[key] as User | null)?.id ?? null
        } else {
          dbPatch[key] = patch[key]
        }
      }
      persistTicket(ticketId, dbPatch)
    }
    patchTicket(ticketId, (t) => ({ ...t, ...patch, updatedAt: new Date().toISOString() }))
  }

  function updateTitle(ticketId: string, title: string) {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket && ticket.title !== title) {
      recordHistory(ticketId, "title", ticket.title, title)
      persistTicket(ticketId, { title })
    }
    patchTicket(ticketId, (t) => ({
      ...t,
      title,
      branch: t.branch?.startsWith("task/") ? toBranchName("task", t.id, title) : t.branch,
      updatedAt: new Date().toISOString(),
    }))
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)

      if (e.key === "Escape") {
        e.preventDefault()
        if (modalTicketId) { closeModal(); return }
        setSelectedId(null)
        return
      }

      if (typing) return

      if (e.key === "/") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modalStack])

  return (
    <div
      className={cn(
        "min-h-screen text-[var(--text)] transition-[padding-left] duration-200 ease-out",
        sidebarExpanded ? "md:pl-[224px]" : "md:pl-[64px]"
      )}
    >
      <Sidebar
        current="Backlog"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur">
          <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <Archive size={14} className="text-[var(--text-faint)]" />
              <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Backlog</h1>
              <span className="rounded-[4px] bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                {tickets.length}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative hidden sm:flex items-center">
                <Search size={13} className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]" />
                <input
                  ref={searchRef}
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setGlobalFilter(""), e.currentTarget.blur())}
                  placeholder="Search backlog…"
                  aria-label="Search backlog"
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
              <NotificationBell userId={currentUser.id} />
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.assign("/tickets?compose=1")}
              >
                <Plus size={13} />
                <span className="hidden sm:inline">New ticket</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-col">
          {tickets.length === 0 ? (
            <div className="mx-3 my-6 flex flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] py-20 text-center sm:mx-6 lg:mx-8">
              <Archive size={22} className="text-[var(--text-faint)]" />
              <p className="text-[14px] font-semibold text-[var(--text)]">No backlog items</p>
              <p className="max-w-[320px] text-[12.5px] text-[var(--text-muted)]">
                Tickets with status &ldquo;Backlog&rdquo; will appear here.
              </p>
            </div>
          ) : (
            <TicketTable
              tickets={tickets}
              selectedId={selectedId}
              users={users}
              attachmentCounts={attachmentCounts}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              onOpen={openTicket}
              viewMode="table"
            />
          )}
        </main>
      </div>

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
          onStatusChange={(status) => applyStatusChange(modalTicket.id, status)}
          onTitleChange={(title) => updateTitle(modalTicket.id, title)}
          onUpdate={(patch) => updateTicket(modalTicket.id, patch)}
          onChildCreate={(_input) => Promise.resolve(undefined)}
          onChildUpdate={(childId, patch) => updateTicket(childId, patch)}
          onChildDelete={() => {}}
          onChildOpen={openTicket}
          onParentChange={() => {}}
        />
      ) : null}
    </div>
  )
}
