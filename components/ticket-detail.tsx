"use client"

import { useEffect, useState } from "react"
import { Bug, CheckCircle2, History, Rocket, Sparkles, X } from "lucide-react"
import { GitPill } from "@/components/git-pill"
import { ModalFrame } from "@/components/modal-frame"
import { StatusIcon } from "@/components/status-icon"
import { IconButton } from "@/components/ui/button"
import { canTransition, STATUS_LABELS, STATUSES, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { HistoryEntry } from "@/lib/db/tickets"
import type { Ticket, WorkType } from "@/types/ticket"
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
  if (workType === "bug") return { Icon: Bug, className: "text-[var(--status-blocked)]" }
  if (workType === "task") return { Icon: CheckCircle2, className: "text-[var(--status-review)]" }
  if (workType === "enhancement") return { Icon: Sparkles, className: "text-[var(--status-progress)]" }
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
  onAssigneeChange,
  onClose,
  onStatusChange,
  onTitleChange,
  onUpdate,
  ticket,
  users
}: {
  onAssigneeChange: (user: User | null) => void
  onClose: () => void
  onStatusChange: (status: Status) => void
  onTitleChange: (title: string) => void
  onUpdate: (patch: Partial<Pick<Ticket, "acceptanceCriteria" | "blockerReason" | "description" | "dueDate" | "estimate" | "workType">>) => void
  ticket: Ticket
  users: User[]
}) {
  const { Icon, className } = workTypeIcon(ticket.workType)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

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
                    x
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
        </section>

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
