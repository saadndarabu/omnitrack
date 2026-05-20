"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  History,
  Layers,
  Link2,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  X
} from "lucide-react"
import { Avatar } from "@/components/avatar"
import { GitPill } from "@/components/git-pill"
import { ModalFrame } from "@/components/modal-frame"
import { StatusIcon } from "@/components/status-icon"
import { IconButton } from "@/components/ui/button"
import { canTransition, STATUS_LABELS, STATUSES, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import { TicketAttachments } from "@/components/ticket-attachments"
import type { HistoryEntry } from "@/lib/db/tickets"
import type { Area, Component, Priority, Ticket, WorkType } from "@/types/ticket"
import type { User } from "@/types/user"

const workTypeLabels: Record<WorkType, string> = {
  feature:     "Feature",
  enhancement: "Enhancement",
  bug:         "Bug",
  task:        "Task",
  epic:        "Epic"
}

const blockerReasons = [
  "Waiting on dependency",
  "Waiting on review",
  "Waiting on GitHub",
  "Needs clarification",
  "External dependency"
] as const

const propertySelectClass =
  "h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"

function workTypeIcon(workType: WorkType) {
  if (workType === "bug")         return { Icon: Bug,          className: "text-[var(--status-blocked)]" }
  if (workType === "task")        return { Icon: CheckCircle2, className: "text-[var(--status-review)]" }
  if (workType === "enhancement") return { Icon: Sparkles,     className: "text-[var(--status-progress)]" }
  if (workType === "epic")        return { Icon: Layers,        className: "text-[#8e2dff]" }
  return { Icon: Rocket, className: "text-[var(--accent)]" }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value))
}

export function TicketDetail({
  currentUser,
  onAssigneeChange,
  onBack,
  onChildCreate,
  onChildDelete,
  onChildOpen,
  onChildUpdate,
  onClose,
  onParentChange,
  onStatusChange,
  onTitleChange,
  onUpdate,
  parentTicket,
  ticket,
  tickets,
  users
}: {
  currentUser: User
  onAssigneeChange: (user: User | null) => void
  onBack?: () => void
  onChildCreate: (input: {
    title: string
    description: string
    workType: WorkType
    status: Status
    priority: Priority
    area: Area
    component: Component
    estimate: string | null
    dueDate: string | null
    acceptanceCriteria: string[]
    blockerReason: string | null
    labels: string[]
    assignee: User | null
  }) => Promise<Ticket | undefined>
  onChildDelete: (childId: string) => void
  onChildOpen: (ticketId: string) => void
  onChildUpdate: (childId: string, patch: Partial<Ticket>) => void
  onClose: () => void
  onParentChange: (parentId: string | null) => void
  onStatusChange: (status: Status) => void
  onTitleChange: (title: string) => void
  onUpdate: (patch: Partial<Pick<Ticket, "acceptanceCriteria" | "blockerReason" | "description" | "dueDate" | "estimate" | "fbApproved" | "workType">>) => void
  parentTicket?: Ticket | null
  ticket: Ticket
  tickets: Ticket[]
  users: User[]
}) {
  const { Icon, className } = workTypeIcon(ticket.workType)
  const [historyOpen, setHistoryOpen]       = useState(false)
  const [history, setHistory]               = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [addingChild, setAddingChild]       = useState(false)
  const [childError, setChildError]         = useState<string | null>(null)
  const [childSaving, setChildSaving]       = useState(false)
  const [parentSearchOpen, setParentSearchOpen] = useState(false)
  const [parentQuery, setParentQuery]       = useState("")
  const childTitleRef = useRef<HTMLInputElement>(null)
  const parentSearchRef = useRef<HTMLInputElement>(null)

  type ChildDraft = {
    title: string
    workType: WorkType
    status: Status
    priority: Priority
    area: Area
    component: Component
    estimate: string
    assigneeId: string
  }

  const [draft, setDraft] = useState<ChildDraft>({
    title:      "",
    workType:   "task",
    status:     "todo",
    priority:   "medium",
    area:       ticket.area,
    component:  ticket.component,
    estimate:   "",
    assigneeId: "unassigned"
  })

  function patchDraft(partial: Partial<ChildDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  useEffect(() => {
    if (addingChild) childTitleRef.current?.focus()
  }, [addingChild])

  useEffect(() => {
    if (parentSearchOpen) parentSearchRef.current?.focus()
  }, [parentSearchOpen])

  useEffect(() => {
    if (!historyOpen) return
    setHistoryLoading(true)
    fetch(`/api/tickets/${ticket.id}/history`)
      .then((res) => res.json())
      .then((data: HistoryEntry[]) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [historyOpen, ticket.id])

  function updateCriterion(index: number, value: string) {
    const nextCriteria = [...ticket.acceptanceCriteria]
    nextCriteria[index] = value
    onUpdate({ acceptanceCriteria: nextCriteria })
  }

  function addCriterion() {
    onUpdate({ acceptanceCriteria: [...ticket.acceptanceCriteria, ""] })
  }

  function removeCriterion(index: number) {
    const nextCriteria = ticket.acceptanceCriteria.filter((_, i) => i !== index)
    onUpdate({ acceptanceCriteria: nextCriteria })
  }

  async function submitChild(e: React.FormEvent) {
    e.preventDefault()
    const cleanTitle = draft.title.trim()
    if (!cleanTitle) return

    setChildSaving(true)
    setChildError(null)

    const result = await onChildCreate({
      title:              cleanTitle,
      description:        "",
      workType:           draft.workType,
      status:             draft.status,
      priority:           draft.priority,
      area:               draft.area,
      component:          draft.component,
      estimate:           draft.estimate.trim() || null,
      dueDate:            null,
      acceptanceCriteria: [],
      blockerReason:      null,
      labels:             [],
      assignee:           users.find((u) => u.id === draft.assigneeId) ?? null
    })

    setChildSaving(false)

    if (result) {
      setDraft({
        title:      "",
        workType:   "task",
        status:     "todo",
        priority:   "medium",
        area:       ticket.area,
        component:  ticket.component,
        estimate:   "",
        assigneeId: "unassigned"
      })
      setAddingChild(false)
    } else {
      setChildError("Failed to create child ticket. Please try again.")
    }
  }

  const isChild = Boolean(ticket.parentId)
  const isEpic  = ticket.workType === "epic"
  const children = ticket.subtasks

  const doneChildren  = children.filter((c) => c.status === "done").length
  const totalChildren = children.length
  const progressPct   = totalChildren === 0 ? 0 : Math.round((doneChildren / totalChildren) * 100)

  // Eligible parents: top-level, non-child tickets that are not the current ticket
  const eligibleParents = tickets.filter(
    (t) => t.id !== ticket.id && !t.parentId
  )

  const filteredParents = parentQuery.trim()
    ? eligibleParents.filter(
        (t) =>
          t.title.toLowerCase().includes(parentQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(parentQuery.toLowerCase())
      )
    : eligibleParents.slice(0, 8)

  return (
    <ModalFrame
      ariaLabel={ticket.id}
      title={
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to parent ticket"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <ArrowLeft size={12} />
              <span className="font-mono">{parentTicket?.id}</span>
            </button>
          ) : (
            <label className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]">
              <Icon size={15} className={className} />
              <select
                aria-label="Work type"
                value={ticket.workType}
                onChange={(event) => onUpdate({ workType: event.target.value as WorkType })}
                className="absolute inset-0 cursor-pointer opacity-0"
                title={workTypeLabels[ticket.workType]}
              >
                {/* Epics can only be set manually if no other mechanism; child tickets cannot become epics */}
                {!isChild && <option value="epic">Epic</option>}
                <option value="feature">Feature</option>
                <option value="enhancement">Enhancement</option>
                <option value="bug">Bug</option>
                <option value="task">Task</option>
              </select>
            </label>
          )}
          <span className="shrink-0 font-mono text-[11px] font-medium text-[var(--text-faint)]">
            {ticket.id}
          </span>
          {isEpic && (
            <span className="shrink-0 rounded-md border border-[#8e2dff]/30 bg-[#8e2dff]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#8e2dff]">
              Epic
            </span>
          )}
          {isChild && !onBack && (
            <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-faint)]">
              Child
            </span>
          )}
          <input
            aria-label="Title"
            value={ticket.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-medium text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
      }
      headerActions={
        <IconButton
          label="History"
          onClick={() => setHistoryOpen((o) => !o)}
          className={historyOpen ? "bg-[var(--surface-2)] text-[var(--text)]" : undefined}
        >
          <History size={18} />
        </IconButton>
      }
      onClose={onClose}
      className="max-w-[980px]"
    >
      <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main content */}
        <section className="min-w-0 space-y-5 border-b-[0.5px] border-[var(--border)] p-4 lg:border-b-0 lg:border-r-[0.5px]">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-[var(--text-faint)]">Description</span>
            <div className="rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)] px-3 py-2.5">
              <textarea
                value={ticket.description}
                onChange={(event) => onUpdate({ description: event.target.value })}
                placeholder="Add description"
                className="w-full resize-none bg-transparent text-[13px] leading-6 text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)] hover:text-[var(--text)] focus:text-[var(--text)]"
                style={{ minHeight: "5rem" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-[var(--text-faint)]">Acceptance criteria</span>
            <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)]">
              {ticket.acceptanceCriteria.length > 0 && (
                <div className="divide-y divide-[var(--border)]">
                  {ticket.acceptanceCriteria.map((criterion, index) => (
                    <div
                      key={`${ticket.id}_criterion_${index}`}
                      className="grid grid-cols-[20px_minmax(0,1fr)_24px] items-center gap-2 px-3 py-2"
                    >
                      <input
                        aria-label={`Acceptance criterion ${index + 1}`}
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-[var(--border-strong)] bg-[var(--surface)] accent-[var(--accent)]"
                      />
                      <input
                        value={criterion}
                        onChange={(event) => updateCriterion(index, event.target.value)}
                        placeholder="Acceptance criterion"
                        className="min-w-0 bg-transparent text-[13px] text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)] focus:text-[var(--text)]"
                      />
                      <button
                        type="button"
                        onClick={() => removeCriterion(index)}
                        aria-label="Remove criterion"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={cn("px-2 py-1.5", ticket.acceptanceCriteria.length > 0 && "border-t-[0.5px] border-[var(--border)]")}>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <Plus size={11} />
                  Add criterion
                </button>
              </div>
            </div>
          </div>

          {/* Children panel — only on non-child tickets */}
          {!isChild && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--text-faint)]">
                    Child tickets
                  </span>
                  {totalChildren > 0 && (
                    <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-faint)]">
                      {doneChildren}/{totalChildren}
                    </span>
                  )}
                </div>
                {!addingChild && (
                  <button
                    type="button"
                    onClick={() => setAddingChild(true)}
                    className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    <Plus size={12} />
                    Add child
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {totalChildren > 0 && (
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div
                    className="h-full rounded-full bg-[#8e2dff] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Child ticket list */}
              {children.length > 0 && (
                <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
                  {children.map((child, i) => (
                    <ChildRow
                      key={child.id}
                      child={child}
                      users={users}
                      isLast={i === children.length - 1}
                      onOpen={() => onChildOpen(child.id)}
                      onDelete={() => onChildDelete(child.id)}
                      onUpdate={(patch) => onChildUpdate(child.id, patch)}
                    />
                  ))}
                </div>
              )}

              {/* Inline add form */}
              {addingChild && (
                <form
                  onSubmit={submitChild}
                  className="overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)]"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
                    <input
                      ref={childTitleRef}
                      value={draft.title}
                      onChange={(e) => patchDraft({ title: e.target.value })}
                      placeholder="Child ticket title…"
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-4">
                    <FieldSelect
                      label="Type"
                      value={draft.workType}
                      onChange={(v) => patchDraft({ workType: v as WorkType })}
                    >
                      <option value="task">Task</option>
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="enhancement">Enhancement</option>
                    </FieldSelect>
                    <FieldSelect
                      label="Status"
                      value={draft.status}
                      onChange={(v) => patchDraft({ status: v as Status })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </FieldSelect>
                    <FieldSelect
                      label="Priority"
                      value={draft.priority}
                      onChange={(v) => patchDraft({ priority: v as Priority })}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </FieldSelect>
                    <FieldSelect
                      label="Owner"
                      value={draft.assigneeId}
                      onChange={(v) => patchDraft({ assigneeId: v })}
                    >
                      <option value="unassigned">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </FieldSelect>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium text-[var(--text-faint)]">Estimate</span>
                      <input
                        value={draft.estimate}
                        onChange={(e) => patchDraft({ estimate: e.target.value })}
                        placeholder="3 pts"
                        className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[#8e2dff]"
                      />
                    </div>
                  </div>

                  {childError && (
                    <p className="px-3 pb-2 text-[11px] text-[var(--status-blocked)]">{childError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => { setAddingChild(false); setChildError(null) }}
                      className="h-7 rounded-lg px-2.5 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={childSaving || !draft.title.trim()}
                      className="h-7 rounded-lg bg-[#111827] px-2.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(17,24,39,0.12)] transition-colors hover:bg-[#1f2937] disabled:opacity-50"
                    >
                      {childSaving ? "Adding…" : "Add child"}
                    </button>
                  </div>
                </form>
              )}

              {totalChildren === 0 && !addingChild && (
                <p className="text-[12px] text-[var(--text-faint)]">
                  No child tickets yet. Adding one will convert this ticket into an Epic.
                </p>
              )}
            </div>
          )}

          {/* Screenshots / Attachments */}
          <TicketAttachments ticketId={ticket.id} currentUser={currentUser} />
        </section>

        {/* Properties sidebar */}
        <aside className="p-4">
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[8px] border border-[var(--border)]">

            {/* Parent ticket — only for non-epic, non-child tickets or existing children */}
            {!isEpic && (
              <PropRow label="Parent">
                {ticket.parentId && parentTicket ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChildOpen(parentTicket.id)}
                      className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--accent)] transition-colors hover:underline"
                    >
                      <span className="font-mono text-[11px] text-[var(--text-faint)]">{parentTicket.id} </span>
                      <span className="truncate">{parentTicket.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onParentChange(null)}
                      aria-label="Remove parent"
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setParentSearchOpen((o) => !o)}
                      className="flex h-7 w-full items-center gap-1.5 rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-faint)] outline-none transition-colors hover:text-[var(--text-muted)]"
                    >
                      <Link2 size={12} className="shrink-0" />
                      <span>Set parent</span>
                    </button>
                    {parentSearchOpen && (
                      <ParentSearchDropdown
                        query={parentQuery}
                        results={filteredParents}
                        onQueryChange={setParentQuery}
                        onSelect={(id) => {
                          onParentChange(id)
                          setParentSearchOpen(false)
                          setParentQuery("")
                        }}
                        onClose={() => { setParentSearchOpen(false); setParentQuery("") }}
                        inputRef={parentSearchRef}
                      />
                    )}
                  </div>
                )}
              </PropRow>
            )}

            <PropRow label="Status">
              <div className="flex items-center gap-2">
                <StatusIcon status={ticket.status} size={13} />
                <SelectControl
                  value={ticket.status}
                  onChange={(value) => onStatusChange(value as Status)}
                >
                  {STATUSES.map((status) => {
                    const disabled =
                      status !== ticket.status && !canTransition(ticket.status, status)
                    return (
                      <option key={status} value={status} disabled={disabled}>
                        {STATUS_LABELS[status]}
                      </option>
                    )
                  })}
                </SelectControl>
              </div>
            </PropRow>

            <PropRow label="Assignee">
              <SelectControl
                value={ticket.assignee?.id ?? "unassigned"}
                onChange={(value) =>
                  onAssigneeChange(users.find((user) => user.id === value) ?? null)
                }
              >
                <option value="unassigned">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </SelectControl>
            </PropRow>

            <PropRow label="Estimate">
              <input
                value={ticket.estimate ?? ""}
                onChange={(event) => onUpdate({ estimate: event.target.value || null })}
                placeholder="—"
                className={propertySelectClass}
              />
            </PropRow>

            <PropRow label="Due Date">
              <input
                type="date"
                value={ticket.dueDate ?? ""}
                onChange={(event) => onUpdate({ dueDate: event.target.value || null })}
                className={propertySelectClass}
              />
            </PropRow>

            <PropRow label="Blocker">
              <SelectControl
                value={ticket.blockerReason ?? ""}
                onChange={(value) => onUpdate({ blockerReason: value || null })}
              >
                <option value="">No blocker</option>
                {ticket.blockerReason &&
                !blockerReasons.includes(ticket.blockerReason as (typeof blockerReasons)[number]) ? (
                  <option value={ticket.blockerReason}>{ticket.blockerReason}</option>
                ) : null}
                {blockerReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </SelectControl>
            </PropRow>

            <PropRow label="FB Approved">
              <button
                type="button"
                role="switch"
                aria-checked={ticket.fbApproved}
                onClick={() => onUpdate({ fbApproved: !ticket.fbApproved })}
                className={cn(
                  "relative inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1",
                  ticket.fbApproved ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200",
                    ticket.fbApproved ? "translate-x-[14px]" : "translate-x-0"
                  )}
                />
              </button>
            </PropRow>

            <PropRow label="Git">
              {ticket.prNumber ? (
                <GitPill type="pr" value={ticket.prNumber} />
              ) : ticket.branch ? (
                <GitPill type="branch" value={ticket.branch} />
              ) : (
                <span className="text-[13px] text-[var(--text-faint)]">—</span>
              )}
            </PropRow>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <CompactDate label="Created" value={ticket.createdAt} />
            <CompactDate label="Updated" value={ticket.updatedAt} />
          </div>
        </aside>
      </div>

      {/* History panel */}
      {historyOpen ? (
        <div className="border-t-[0.5px] border-[var(--border)]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] font-semibold text-[var(--text)]">History</span>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Close history"
            >
              <X size={13} />
            </button>
          </div>

          {historyLoading ? (
            <p className="px-4 pb-4 text-[12px] text-[var(--text-faint)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-[var(--text-faint)]">No changes recorded yet.</p>
          ) : (
            <ol className="max-h-[240px] overflow-y-auto px-4 pb-4">
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3 py-2 [&:not(:last-child)]:border-b-[0.5px] [&:not(:last-child)]:border-[var(--border)]">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--text-muted)]">
                    {entry.actorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[var(--text)]">
                      <span className="font-medium">{entry.actorName}</span>
                      {" changed "}
                      <span className="font-medium capitalize">{entry.field.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                      {entry.oldValue != null ? (
                        <>
                          {" from "}
                          <span className="rounded bg-[var(--surface-2)] px-1 font-mono text-[11px]">{entry.oldValue}</span>
                        </>
                      ) : null}
                      {entry.newValue != null ? (
                        <>
                          {" to "}
                          <span className="rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1 font-mono text-[11px] text-[var(--accent)]">{entry.newValue}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                      {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt))}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </ModalFrame>
  )
}

// ── Child ticket row ──────────────────────────────────────────

function ChildRow({
  child,
  isLast,
  users,
  onDelete,
  onOpen,
  onUpdate
}: {
  child: Ticket
  isLast: boolean
  users: User[]
  onDelete: () => void
  onOpen: () => void
  onUpdate: (patch: Partial<Ticket>) => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const { Icon, className } = workTypeIcon(child.workType)

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_50%,transparent)]",
        !isLast && "border-b border-[var(--border)]"
      )}
    >
      {/* Work type icon */}
      <div className="shrink-0">
        <Icon size={13} className={cn(className, "opacity-70")} />
      </div>

      {/* Status toggle */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setStatusOpen((o) => !o)}
          aria-label={`Status: ${STATUS_LABELS[child.status]}`}
          className="rounded p-0.5 transition-colors hover:bg-[var(--surface-2)]"
        >
          <StatusIcon status={child.status} size={13} />
        </button>
        {statusOpen && (
          <StatusDropdown
            current={child.status}
            onSelect={(s) => {
              onUpdate({ status: s })
              setStatusOpen(false)
            }}
            onClose={() => setStatusOpen(false)}
          />
        )}
      </div>

      {/* ID + title */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="mr-1.5 font-mono text-[10px] text-[var(--text-faint)]">{child.id}</span>
        <span
          className={cn(
            "text-[13px] text-[var(--text)]",
            child.status === "done" && "text-[var(--text-faint)] line-through"
          )}
        >
          {child.title}
        </span>
      </button>

      {/* Assignee */}
      <div className="shrink-0">
        <Avatar user={child.assignee} size={22} />
      </div>

      {/* Due date */}
      {child.dueDate && (
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-faint)]">
          {child.dueDate}
        </span>
      )}

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open child ticket"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <ExternalLink size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Remove child ticket"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-blocked)_10%,transparent)] hover:text-[var(--status-blocked)]"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Parent search dropdown ────────────────────────────────────

function ParentSearchDropdown({
  inputRef,
  onClose,
  onQueryChange,
  onSelect,
  query,
  results
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputRef: any
  onClose: () => void
  onQueryChange: (q: string) => void
  onSelect: (id: string) => void
  query: string
  results: Ticket[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full z-40 mt-1 w-[260px] overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(16,24,40,0.12)]"
    >
      <div className="border-b border-[var(--border)] px-2.5 py-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tickets…"
          className="w-full bg-transparent text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto py-1">
        {results.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-[var(--text-faint)]">No matching tickets</p>
        ) : (
          results.map((t) => {
            const { Icon, className } = workTypeIcon(t.workType)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--surface-2)]"
              >
                <Icon size={12} className={className} />
                <span className="font-mono text-[10px] text-[var(--text-faint)]">{t.id}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--text)]">{t.title}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Tiny status dropdown ──────────────────────────────────────

function StatusDropdown({
  current,
  onClose,
  onSelect
}: {
  current: Status
  onClose: () => void
  onSelect: (status: Status) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_12px_rgba(16,24,40,0.10)]"
    >
      {STATUSES.map((status) => {
        const disabled = status !== current && !canTransition(current, status)
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(status)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--surface-2)]",
              status === current ? "text-[var(--text)]" : "text-[var(--text-muted)]",
              disabled && "pointer-events-none opacity-40"
            )}
          >
            <StatusIcon status={status} size={13} />
            {STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────

function FieldSelect({
  children,
  label,
  onChange,
  value
}: {
  children: React.ReactNode
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-[var(--text-faint)]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] pl-2 pr-6 text-[12px] text-[var(--text)] outline-none focus:border-[#8e2dff]"
        >
          {children}
        </select>
        <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
      </div>
    </div>
  )
}

function PropRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]">
      <span className="text-[11px] font-medium text-[var(--text-faint)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  )
}

function SelectControl({
  children,
  onChange,
  value
}: {
  children: React.ReactNode
  onChange: (value: string) => void
  value: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={propertySelectClass}
    >
      {children}
    </select>
  )
}

function CompactDate({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-medium text-[var(--text-faint)]">{label}</div>
      <div className="truncate text-[12px] text-[var(--text-muted)]">{formatDateTime(value)}</div>
    </div>
  )
}
