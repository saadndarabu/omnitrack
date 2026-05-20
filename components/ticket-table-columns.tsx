"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Bug, CheckCircle2, CheckSquare, ChevronDown, GitBranch, Layers, Paperclip, Rocket, Sparkles, Square, TriangleAlert } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { Tag } from "@/components/tag"
import { relTime } from "@/lib/rel-time"
import { STATUS_LABELS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Priority, Ticket, WorkType } from "@/types/ticket"

export type SubtaskContext = {
  showSubtasks: boolean
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}

const priorityLabels: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low"
}

// Critical uses --status-blocked (red). High uses a distinct amber token.
// Medium uses --status-review (purple/violet). Low is muted.
const priorityPill: Record<Priority, string> = {
  critical:
    "border-[color-mix(in_srgb,var(--status-blocked)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_8%,transparent)] text-[var(--status-blocked)]",
  high:
    "border-[color-mix(in_srgb,var(--status-high)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-high)_8%,transparent)] text-[var(--status-high)]",
  medium:
    "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-muted)]",
  low:
    "border-[var(--border)] bg-transparent text-[var(--text-faint)]"
}

const statusChip: Record<Status, string> = {
  backlog:     "border-[var(--border)] bg-transparent text-[var(--text-faint)]",
  todo:        "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
  in_progress: "border-[color-mix(in_srgb,var(--status-progress)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-progress)_8%,transparent)] text-[var(--status-progress)]",
  in_review:   "border-[color-mix(in_srgb,var(--status-review)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-review)_8%,transparent)] text-[var(--status-review)]",
  blocked:     "border-[color-mix(in_srgb,var(--status-blocked)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_8%,transparent)] text-[var(--status-blocked)]",
  done:        "border-[color-mix(in_srgb,var(--status-done)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-done)_8%,transparent)] text-[var(--status-done)]",
}

const workTypeLabels: Record<WorkType, string> = {
  feature:     "Feature",
  enhancement: "Enhancement",
  bug:         "Bug",
  task:        "Task",
  epic:        "Epic"
}

const priorityRank: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

const statusRank: Record<Status, number> = {
  blocked: 0,
  in_progress: 1,
  in_review: 2,
  todo: 3,
  backlog: 4,
  done: 5
}

// Stable label → hue mapping: hash label name to one of 8 palette slots
const LABEL_PALETTE: Array<{ border: string; bg: string; text: string }> = [
  { border: "color-mix(in_srgb,var(--label-0)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-0)_12%,transparent)", text: "var(--label-0)" },
  { border: "color-mix(in_srgb,var(--label-1)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-1)_12%,transparent)", text: "var(--label-1)" },
  { border: "color-mix(in_srgb,var(--label-2)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-2)_12%,transparent)", text: "var(--label-2)" },
  { border: "color-mix(in_srgb,var(--label-3)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-3)_12%,transparent)", text: "var(--label-3)" },
  { border: "color-mix(in_srgb,var(--label-4)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-4)_12%,transparent)", text: "var(--label-4)" },
  { border: "color-mix(in_srgb,var(--label-5)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-5)_12%,transparent)", text: "var(--label-5)" },
  { border: "color-mix(in_srgb,var(--label-6)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-6)_12%,transparent)", text: "var(--label-6)" },
  { border: "color-mix(in_srgb,var(--label-7)_40%,transparent)", bg: "color-mix(in_srgb,var(--label-7)_12%,transparent)", text: "var(--label-7)" },
]

function labelHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) % LABEL_PALETTE.length
}

function getLabelSlot(label: string) {
  return LABEL_PALETTE[labelHash(label)]
}

export function StatusCell({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] w-[88px] items-center justify-center rounded-[4px] border text-[11px] font-medium leading-none",
        statusChip[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityCell({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] w-[80px] items-center justify-center rounded-[4px] border text-[11px] font-medium leading-none",
        priorityPill[priority]
      )}
    >
      {priorityLabels[priority]}
    </span>
  )
}

export function WorkTypeCell({ workType }: { workType: WorkType }) {
  const Icon =
    workType === "bug"         ? Bug
    : workType === "task"      ? CheckCircle2
    : workType === "enhancement" ? Sparkles
    : workType === "epic"      ? Layers
    : Rocket
  const cls =
    workType === "bug"         ? "text-[var(--status-blocked)]"
    : workType === "task"      ? "text-[var(--text-muted)]"
    : workType === "enhancement" ? "text-[var(--status-progress)]"
    : workType === "epic"      ? "text-[var(--status-review)]"
    : "text-[var(--text-muted)]"

  return (
    <span
      title={workTypeLabels[workType]}
      aria-label={workTypeLabels[workType]}
      className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)]"
    >
      <Icon size={12} className={cls} strokeWidth={2} />
    </span>
  )
}

export function OwnerCell({ ticket }: { ticket: Ticket }) {
  if (!ticket.assignee) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Avatar user={null} size={22} />
        <span className="truncate text-[13px] text-[var(--text-faint)]">Unassigned</span>
      </span>
    )
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar user={ticket.assignee} size={22} />
      <span className="truncate text-[13px] text-[var(--text-muted)]">
        {ticket.assignee.name}
      </span>
    </span>
  )
}

export function TitleCell({
  ticket,
  subtaskCtx
}: {
  ticket: Ticket
  subtaskCtx?: SubtaskContext
}) {
  const hasSubtasks = ticket.subtasks.length > 0
  const isExpanded = subtaskCtx?.expandedIds.has(ticket.id) ?? false

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="block truncate text-[13px] font-medium text-[var(--text)]">
        {ticket.title}
      </span>
      {subtaskCtx?.showSubtasks && hasSubtasks ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            subtaskCtx.onToggleExpand(ticket.id)
          }}
          title={isExpanded ? "Collapse children" : `${ticket.subtasks.length} child ticket${ticket.subtasks.length === 1 ? "" : "s"}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            isExpanded
              ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-faint)] hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
          )}
        >
          <GitBranch size={9} />
          {ticket.subtasks.length}
          <ChevronDown
            size={9}
            className={cn("transition-transform", isExpanded && "rotate-180")}
          />
        </button>
      ) : null}
    </span>
  )
}

function ColoredTag({ label }: { label: string }) {
  const slot = getLabelSlot(label)
  return (
    <span
      style={{
        borderColor: slot.border,
        color: slot.text,
      }}
      className="inline-flex h-[18px] items-center rounded-[4px] border bg-transparent px-1.5 text-[10.5px] font-medium"
    >
      {label.toLowerCase()}
    </span>
  )
}

export function LabelsCell({ ticket }: { ticket: Ticket }) {
  if (ticket.labels.length === 0) {
    return <span className="text-[12px] text-[var(--text-faint)]">—</span>
  }

  return (
    <span className="flex min-w-0 items-center gap-1 overflow-hidden">
      {ticket.labels.slice(0, 2).map((label) => (
        <ColoredTag key={label} label={label} />
      ))}
      {ticket.labels.length > 2 ? (
        <span className="text-[11px] font-medium text-[var(--text-faint)]">
          +{ticket.labels.length - 2}
        </span>
      ) : null}
    </span>
  )
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "—"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${dueDate}T00:00:00`))
}

function formatAbsDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`))
}

function dueDateDisplay(dueDate: string | null, status: Status): {
  label: string
  isOverdue: boolean
  isDue: boolean
  tooltip: string
} {
  if (!dueDate) return { label: "—", isOverdue: false, isDue: false, tooltip: "" }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(`${dueDate}T00:00:00`)
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000)
  const tooltip = formatAbsDate(dueDate)

  // Done: show relative past tense, no overdue treatment
  if (status === "done") {
    const label = diffDays >= 0
      ? (diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `${diffDays}d`)
      : `${-diffDays}d ago`
    return { label, isOverdue: false, isDue: false, tooltip }
  }

  // Overdue: icon + bare days number
  if (diffDays < 0) {
    return { label: `${-diffDays}d`, isOverdue: true, isDue: false, tooltip }
  }

  // Due today or tomorrow
  if (diffDays === 0) return { label: "Today", isOverdue: false, isDue: true, tooltip }
  if (diffDays === 1) return { label: "1d", isOverdue: false, isDue: true, tooltip }

  // Due in future: bare days, not muted
  return { label: `${diffDays}d`, isOverdue: false, isDue: true, tooltip }
}

export function DueDateCell({ ticket }: { ticket: Ticket }) {
  const { label, isOverdue, isDue, tooltip } = dueDateDisplay(ticket.dueDate, ticket.status)

  return (
    <span
      title={tooltip || undefined}
      className={cn(
        "inline-flex items-center gap-1 text-[12px]",
        isOverdue
          ? "font-semibold text-[var(--status-blocked)]"
          : isDue
            ? "font-medium text-[var(--text)]"
            : "text-[var(--text-faint)]"
      )}
    >
      {isOverdue ? <TriangleAlert size={11} className="shrink-0" /> : null}
      {label}
    </span>
  )
}

export function UpdatedCell({ updatedAt }: { updatedAt: string }) {
  const absDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(updatedAt))

  return (
    <span title={absDate} className="text-[12px] text-[var(--text-faint)]">
      {relTime(updatedAt)}
    </span>
  )
}

export function createTicketColumns(
  attachmentCounts: Record<string, number> = {},
  subtaskCtx?: SubtaskContext
): ColumnDef<Ticket>[] {
  return [
    {
      id: "id",
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] font-medium text-[var(--text-muted)]">
          {row.original.id.replace(/^SIRP-/i, "")}
        </span>
      ),
      enableHiding: false,
      meta: { width: "w-[56px]" }
    },
    {
      id: "workType",
      accessorKey: "workType",
      header: "Type",
      cell: ({ row }) => <WorkTypeCell workType={row.original.workType} />,
      enableHiding: false,
      meta: { width: "w-[52px]" }
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <TitleCell ticket={row.original} subtaskCtx={subtaskCtx} />,
      meta: { width: "min-w-[200px] flex-1" }
    },
    {
      id: "labels",
      accessorFn: (ticket) => ticket.labels.join(" "),
      header: "Labels",
      enableSorting: false,
      cell: ({ row }) => <LabelsCell ticket={row.original} />,
      meta: { width: "w-[140px]" }
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusCell status={row.original.status} />,
      sortingFn: (a, b) =>
        statusRank[a.original.status] - statusRank[b.original.status],
      meta: { width: "w-[120px]" }
    },
    {
      id: "owner",
      accessorFn: (ticket) => ticket.assignee?.name ?? "Unassigned",
      header: "Owner",
      cell: ({ row }) => <OwnerCell ticket={row.original} />,
      meta: { width: "w-[148px]" }
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <PriorityCell priority={row.original.priority} />,
      sortingFn: (a, b) =>
        priorityRank[a.original.priority] - priorityRank[b.original.priority],
      meta: { width: "w-[92px]" }
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => <DueDateCell ticket={row.original} />,
      sortingFn: (a, b) =>
        (a.original.dueDate ?? "9999-12-31").localeCompare(
          b.original.dueDate ?? "9999-12-31"
        ),
      meta: { width: "w-[100px]" }
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => <UpdatedCell updatedAt={row.original.updatedAt} />,
      meta: { width: "w-[72px]" }
    },
    {
      id: "attachments",
      accessorFn: (ticket) => attachmentCounts[ticket.id] ?? 0,
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const count = attachmentCounts[row.original.id] ?? 0
        if (count === 0) return null
        return (
          <span
            title={`${count} screenshot${count === 1 ? "" : "s"}`}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--text-faint)]"
          >
            <Paperclip size={11} />
            {count}
          </span>
        )
      },
      meta: { width: "w-[40px]" }
    },
    {
      id: "area",
      accessorKey: "area",
      header: "Area",
      cell: ({ row }) => (
        <span className="text-[12px] capitalize text-[var(--text-muted)]">
          {row.original.area}
        </span>
      ),
      meta: { width: "w-[110px]" }
    },
    {
      id: "component",
      accessorKey: "component",
      header: "Component",
      cell: ({ row }) => (
        <span className="text-[12px] capitalize text-[var(--text-muted)]">
          {row.original.component}
        </span>
      ),
      meta: { width: "w-[120px]" }
    },
    {
      id: "estimate",
      accessorKey: "estimate",
      header: "Estimate",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-muted)]">
          {row.original.estimate ?? <span className="text-[var(--text-faint)]">—</span>}
        </span>
      ),
      meta: { width: "w-[88px]" }
    },
    {
      id: "fbApproved",
      accessorKey: "fbApproved",
      header: "FB Approved",
      enableSorting: true,
      cell: ({ row }) =>
        row.original.fbApproved ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)]">
            <CheckSquare size={13} />
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-faint)]">
            <Square size={13} />
            No
          </span>
        ),
      meta: { width: "w-[110px]" }
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block max-w-[300px] truncate text-[12px] text-[var(--text-muted)]">
          {row.original.description}
        </span>
      ),
      meta: { width: "w-[300px]" }
    }
  ]
}

export const COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  id: "ID",
  title: "Title",
  labels: "Labels",
  workType: "Type",
  owner: "Owner",
  priority: "Priority",
  dueDate: "Due",
  updatedAt: "Updated",
  attachments: "Files",
  area: "Area",
  component: "Component",
  estimate: "Estimate",
  fbApproved: "FB Approved",
  description: "Description"
}

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  id: true,
  workType: true,
  title: true,
  labels: true,
  status: true,
  owner: true,
  priority: true,
  dueDate: true,
  updatedAt: true,
  attachments: true,
  area: false,
  component: false,
  estimate: false,
  fbApproved: false,
  description: false
}
