"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bug,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  History,
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
  feature: "Feature",
  enhancement: "Enhancement",
  bug: "Bug",
  task: "Task"
}

const blockerReasons = [
  "Waiting on dependency",
  "Waiting on review",
  "Waiting on GitHub",
  "Needs clarification",
  "External dependency"
] as const

const editableTextClass =
  "w-full rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors placeholder:text-[var(--text-faint)] hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"

const propertySelectClass =
  "h-7 w-full appearance-none rounded-md border-[0.5px] border-transparent bg-transparent px-0 text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--text)] focus:border-[color-mix(in_srgb,var(--accent)_42%,transparent)] focus:bg-[color-mix(in_srgb,var(--surface-2)_38%,transparent)] focus:px-2 focus:text-[var(--text)]"

function workTypeIcon(workType: WorkType) {
  if (workType === "bug")         return { Icon: Bug,          className: "text-[var(--status-blocked)]" }
  if (workType === "task")        return { Icon: CheckCircle2, className: "text-[var(--status-review)]" }
  if (workType === "enhancement") return { Icon: Sparkles,     className: "text-[var(--status-progress)]" }
  return { Icon: Rocket, className: "text-[var(--accent)]" }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value))
}

type SubtaskDraft = {
  title: string
  workType: WorkType
  status: Status
  priority: Priority
  area: Area
  component: Component
  estimate: string
  dueDate: string
  assigneeId: string
}

export function TicketDetail({
  currentUser,
  onAssigneeChange,
  onClose,
  onStatusChange,
  onSubtaskCreate,
  onSubtaskDelete,
  onSubtaskOpen,
  onSubtaskUpdate,
  onTitleChange,
  onUpdate,
  ticket,
  users
}: {
  currentUser: User
  onAssigneeChange: (user: User | null) => void
  onClose: () => void
  onStatusChange: (status: Status) => void
  onSubtaskCreate: (input: {
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
  onSubtaskDelete: (subtaskId: string) => void
  onSubtaskOpen: (ticketId: string) => void
  onSubtaskUpdate: (subtaskId: string, patch: Partial<Ticket>) => void
  onTitleChange: (title: string) => void
  onUpdate: (patch: Partial<Pick<Ticket, "acceptanceCriteria" | "blockerReason" | "description" | "dueDate" | "estimate" | "workType">>) => void
  ticket: Ticket
  users: User[]
}) {
  const { Icon, className } = workTypeIcon(ticket.workType)
  const [historyOpen, setHistoryOpen]     = useState(false)
  const [history, setHistory]             = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskError, setSubtaskError]   = useState<string | null>(null)
  const [subtaskSaving, setSubtaskSaving] = useState(false)
  const subtaskTitleRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<SubtaskDraft>({
    title:      "",
    workType:   "task",
    status:     "todo",
    priority:   "medium",
    area:       ticket.area,
    component:  ticket.component,
    estimate:   "",
    dueDate:    "",
    assigneeId: "unassigned"
  })

  function patchDraft(partial: Partial<SubtaskDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  useEffect(() => {
    if (addingSubtask) {
      subtaskTitleRef.current?.focus()
    }
  }, [addingSubtask])

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
    const nextCriteria = ticket.acceptanceCriteria.filter((_, itemIndex) => itemIndex !== index)
    onUpdate({ acceptanceCriteria: nextCriteria })
  }

  async function submitSubtask(e: React.FormEvent) {
    e.preventDefault()
    const cleanTitle = draft.title.trim()
    if (!cleanTitle) return

    // Client-side due date guard
    if (draft.dueDate && ticket.dueDate && draft.dueDate > ticket.dueDate) {
      setSubtaskError(`Due date cannot exceed parent due date (${ticket.dueDate})`)
      return
    }

    setSubtaskSaving(true)
    setSubtaskError(null)

    const result = await onSubtaskCreate({
      title:              cleanTitle,
      description:        "",
      workType:           draft.workType,
      status:             draft.status,
      priority:           draft.priority,
      area:               draft.area,
      component:          draft.component,
      estimate:           draft.estimate.trim() || null,
      dueDate:            draft.dueDate || null,
      acceptanceCriteria: [],
      blockerReason:      null,
      labels:             [],
      assignee:           users.find((u) => u.id === draft.assigneeId) ?? null
    })

    setSubtaskSaving(false)

    if (result) {
      setDraft({
        title:      "",
        workType:   "task",
        status:     "todo",
        priority:   "medium",
        area:       ticket.area,
        component:  ticket.component,
        estimate:   "",
        dueDate:    "",
        assigneeId: "unassigned"
      })
      setAddingSubtask(false)
    } else {
      setSubtaskError("Failed to create subtask. Check the due date and try again.")
    }
  }

  const doneSubtasks  = ticket.subtasks.filter((s) => s.status === "done").length
  const totalSubtasks = ticket.subtasks.length
  const progressPct   = totalSubtasks === 0 ? 0 : Math.round((doneSubtasks / totalSubtasks) * 100)

  // Subtasks panel is only shown on non-subtask tickets (parentId is null).
  const isSubtask = Boolean(ticket.parentId)

  return (
    <ModalFrame
      ariaLabel={ticket.id}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <label className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]">
            <Icon size={15} className={className} />
            <select
              aria-label="Work type"
              value={ticket.workType}
              onChange={(event) => onUpdate({ workType: event.target.value as WorkType })}
              className="absolute inset-0 cursor-pointer opacity-0"
              title={workTypeLabels[ticket.workType]}
            >
              <option value="feature">Feature</option>
              <option value="enhancement">Enhancement</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
            </select>
          </label>
          <span className="shrink-0 font-mono text-[11px] font-medium text-[var(--text-faint)]">
            {ticket.id}
          </span>
          {isSubtask && (
            <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-faint)]">
              Subtask
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
          <Field label="Description">
            <textarea
              value={ticket.description}
              onChange={(event) => onUpdate({ description: event.target.value })}
              placeholder="Add description"
              className={cn(editableTextClass, "min-h-24 resize-none py-0 leading-6 focus:py-2")}
            />
          </Field>

          <div className="space-y-2">
            <div className="text-[11px] font-medium text-[var(--text-faint)]">
              Acceptance criteria
            </div>
            <div className="space-y-1.5">
              {ticket.acceptanceCriteria.map((criterion, index) => (
                <div
                  key={`${ticket.id}_criterion_${index}`}
                  className="grid grid-cols-[20px_minmax(0,1fr)_24px] items-center gap-2 rounded-md border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_68%,transparent)] px-2 py-1.5"
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
                    className="min-w-0 bg-transparent text-[13px] text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    aria-label="Remove criterion"
                    className="h-6 rounded text-[11px] text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCriterion}
                className="h-7 rounded-md px-2 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                Add criterion
              </button>
            </div>
          </div>

          {/* Subtasks panel — only on parent tickets */}
          {!isSubtask && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--text-faint)]">
                    Subtasks
                  </span>
                  {totalSubtasks > 0 && (
                    <span className="text-[11px] text-[var(--text-faint)]">
                      {doneSubtasks}/{totalSubtasks}
                    </span>
                  )}
                </div>
                {!addingSubtask && (
                  <button
                    type="button"
                    onClick={() => setAddingSubtask(true)}
                    className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  >
                    <Plus size={12} />
                    Add subtask
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--status-done)] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Subtask rows */}
              {ticket.subtasks.length > 0 && (
                <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
                  {ticket.subtasks.map((subtask) => (
                    <SubtaskRow
                      key={subtask.id}
                      subtask={subtask}
                      parentDueDate={ticket.dueDate}
                      users={users}
                      onOpen={() => onSubtaskOpen(subtask.id)}
                      onDelete={() => onSubtaskDelete(subtask.id)}
                      onUpdate={(patch) => onSubtaskUpdate(subtask.id, patch)}
                    />
                  ))}
                </div>
              )}

              {/* Inline add form */}
              {addingSubtask && (
                <form
                  onSubmit={submitSubtask}
                  className="overflow-hidden rounded-xl border border-[var(--accent)] bg-[var(--surface)]"
                >
                  <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                    <input
                      ref={subtaskTitleRef}
                      value={draft.title}
                      onChange={(e) => patchDraft({ title: e.target.value })}
                      placeholder="Subtask title…"
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-3 py-2 sm:grid-cols-4">
                    <SubtaskSelect
                      label="Type"
                      value={draft.workType}
                      onChange={(v) => patchDraft({ workType: v as WorkType })}
                    >
                      <option value="task">Task</option>
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="enhancement">Enhancement</option>
                    </SubtaskSelect>
                    <SubtaskSelect
                      label="Status"
                      value={draft.status}
                      onChange={(v) => patchDraft({ status: v as Status })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </SubtaskSelect>
                    <SubtaskSelect
                      label="Priority"
                      value={draft.priority}
                      onChange={(v) => patchDraft({ priority: v as Priority })}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </SubtaskSelect>
                    <SubtaskSelect
                      label="Owner"
                      value={draft.assigneeId}
                      onChange={(v) => patchDraft({ assigneeId: v })}
                    >
                      <option value="unassigned">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </SubtaskSelect>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium text-[var(--text-faint)]">Due date</span>
                      <input
                        type="date"
                        value={draft.dueDate}
                        max={ticket.dueDate ?? undefined}
                        onChange={(e) => {
                          patchDraft({ dueDate: e.target.value })
                          setSubtaskError(null)
                        }}
                        className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium text-[var(--text-faint)]">Estimate</span>
                      <input
                        value={draft.estimate}
                        onChange={(e) => patchDraft({ estimate: e.target.value })}
                        placeholder="3 pts"
                        className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {subtaskError && (
                    <p className="px-3 pb-2 text-[11px] text-[var(--status-blocked)]">{subtaskError}</p>
                  )}

                  <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
                    {ticket.dueDate && (
                      <span className="text-[11px] text-[var(--text-faint)]">
                        Parent due: {ticket.dueDate}
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAddingSubtask(false); setSubtaskError(null) }}
                        className="h-7 rounded-lg px-2.5 text-[12px] font-medium text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={subtaskSaving || !draft.title.trim()}
                        className="h-7 rounded-lg bg-[#111827] px-2.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(17,24,39,0.12)] transition-colors hover:bg-[#1f2937] disabled:opacity-50"
                      >
                        {subtaskSaving ? "Adding…" : "Add subtask"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {totalSubtasks === 0 && !addingSubtask && (
                <p className="text-[12px] text-[var(--text-faint)]">
                  No subtasks yet. Add one to break this work across multiple repos.
                </p>
              )}
            </div>
          )}

          {/* Screenshots / Attachments */}
          <TicketAttachments ticketId={ticket.id} currentUser={currentUser} />
        </section>

        {/* Properties sidebar */}
        <aside className="space-y-4 p-4">
          <InlineField label="Status">
            <div className="flex items-center gap-2">
              <StatusIcon status={ticket.status} size={14} />
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
          </InlineField>

          <InlineField label="Assignee">
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
          </InlineField>

          <InlineField label="Estimate">
            <input
              value={ticket.estimate ?? ""}
              onChange={(event) => onUpdate({ estimate: event.target.value || null })}
              placeholder="No estimate"
              className={propertySelectClass}
            />
          </InlineField>

          <InlineField label="Due Date">
            <input
              type="date"
              value={ticket.dueDate ?? ""}
              onChange={(event) => onUpdate({ dueDate: event.target.value || null })}
              className={propertySelectClass}
            />
          </InlineField>

          <InlineField label="Blocker Reason">
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
          </InlineField>

          <InlineField label="Git">
            {ticket.prNumber ? (
              <GitPill type="pr" value={ticket.prNumber} />
            ) : ticket.branch ? (
              <GitPill type="branch" value={ticket.branch} />
            ) : (
              <span className="text-[13px] text-[var(--text-muted)]">No branch</span>
            )}
          </InlineField>

          <div className="grid grid-cols-2 gap-3 border-t-[0.5px] border-[var(--border)] pt-3">
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

// ── Subtask row ───────────────────────────────────────────────

function SubtaskRow({
  subtask,
  parentDueDate,
  users,
  onDelete,
  onOpen,
  onUpdate
}: {
  subtask: Ticket
  parentDueDate: string | null
  users: User[]
  onDelete: () => void
  onOpen: () => void
  onUpdate: (patch: Partial<Ticket>) => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#FAF9F6]">
      {/* Status toggle */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setStatusOpen((o) => !o)}
          aria-label={`Status: ${STATUS_LABELS[subtask.status]}`}
          className="rounded p-0.5 transition-colors hover:bg-[var(--surface-2)]"
        >
          <StatusIcon status={subtask.status} size={14} />
        </button>
        {statusOpen && (
          <StatusDropdown
            current={subtask.status}
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
        <span className="mr-1.5 font-mono text-[10px] text-[var(--text-faint)]">{subtask.id}</span>
        <span
          className={cn(
            "text-[13px] text-[var(--text)]",
            subtask.status === "done" && "text-[var(--text-faint)] line-through"
          )}
        >
          {subtask.title}
        </span>
      </button>

      {/* Assignee */}
      <div className="shrink-0">
        <Avatar user={subtask.assignee} size={22} />
      </div>

      {/* Due date */}
      {subtask.dueDate && (
        <span className="shrink-0 text-[11px] text-[var(--text-faint)]">
          {subtask.dueDate}
        </span>
      )}

      {/* Actions — visible on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open subtask"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <ExternalLink size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete subtask"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-faint)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-blocked)_10%,transparent)] hover:text-[var(--status-blocked)]"
        >
          <Trash2 size={12} />
        </button>
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
      className="absolute left-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_12px_rgba(16,24,40,0.10)]"
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

function SubtaskSelect({
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
          className="h-7 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] pl-2 pr-6 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
        >
          {children}
        </select>
        <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
      </div>
    </div>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="block text-[11px] font-medium text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  )
}

function InlineField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-medium text-[var(--text-faint)]">{label}</span>
      {children}
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
