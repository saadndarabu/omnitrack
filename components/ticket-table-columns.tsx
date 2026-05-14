"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Bug, CheckCircle2, Paperclip, Rocket, Sparkles } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { StatusIcon } from "@/components/status-icon"
import { Tag } from "@/components/tag"
import { relTime } from "@/lib/rel-time"
import { STATUS_LABELS, type Status } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Priority, Ticket, WorkType } from "@/types/ticket"

const priorityLabels: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low"
}

const priorityPill: Record<Priority, string> = {
  critical:
    "border-[color-mix(in_srgb,var(--status-blocked)_36%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_12%,transparent)] text-[color-mix(in_srgb,var(--status-blocked)_88%,var(--text))]",
  high:
    "border-[color-mix(in_srgb,var(--status-progress)_34%,transparent)] bg-[color-mix(in_srgb,var(--status-progress)_12%,transparent)] text-[color-mix(in_srgb,var(--status-progress)_88%,var(--text))]",
  medium:
    "border-[color-mix(in_srgb,var(--status-review)_32%,transparent)] bg-[color-mix(in_srgb,var(--status-review)_11%,transparent)] text-[color-mix(in_srgb,var(--status-review)_88%,var(--text))]",
  low:
    "border-[color-mix(in_srgb,var(--text-faint)_30%,transparent)] bg-[color-mix(in_srgb,var(--text-faint)_10%,transparent)] text-[var(--text-muted)]"
}

const workTypeLabels: Record<WorkType, string> = {
  feature: "Feature",
  enhancement: "Enhancement",
  bug: "Bug",
  task: "Task"
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

export function StatusCell({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2 leading-none">
      <StatusIcon status={status} size={14} />
      <span className="text-[12px] text-[var(--text-muted)]">{STATUS_LABELS[status]}</span>
    </span>
  )
}

export function PriorityCell({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-md border px-2 text-[11px] font-semibold leading-none tracking-wide",
        priorityPill[priority]
      )}
    >
      {priorityLabels[priority]}
    </span>
  )
}

export function WorkTypeCell({ workType }: { workType: WorkType }) {
  const Icon =
    workType === "bug"
      ? Bug
      : workType === "task"
        ? CheckCircle2
        : workType === "enhancement"
          ? Sparkles
          : Rocket
  const className =
    workType === "bug"
      ? "text-[var(--status-blocked)]"
      : workType === "task"
        ? "text-[var(--status-review)]"
        : workType === "enhancement"
          ? "text-[var(--status-progress)]"
          : "text-[var(--accent)]"

  return (
    <span
      title={workTypeLabels[workType]}
      aria-label={workTypeLabels[workType]}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_44%,transparent)]"
    >
      <Icon size={14} className={className} />
    </span>
  )
}

export function OwnerCell({ ticket }: { ticket: Ticket }) {
  if (!ticket.assignee) {
    return (
      <span className="inline-flex h-[22px] items-center rounded-md border border-dashed border-[var(--border-strong)] px-2 text-[11px] font-medium text-[var(--text-faint)]">
        Unassigned
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

export function TitleCell({ ticket }: { ticket: Ticket }) {
  return (
    <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
      {ticket.title}
    </span>
  )
}

export function LabelsCell({ ticket }: { ticket: Ticket }) {
  if (ticket.labels.length === 0) {
    return <span className="text-[12px] text-[var(--text-faint)]">—</span>
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {ticket.labels.slice(0, 2).map((label) => (
        <Tag key={label} value={label} />
      ))}
      {ticket.labels.length > 2 ? (
        <span className="text-[11px] font-medium text-[var(--text-faint)]">
          +{ticket.labels.length - 2}
        </span>
      ) : null}
    </span>
  )
}

export function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "—"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dueDate}T00:00:00`))
}

export function createTicketColumns(
  attachmentCounts: Record<string, number> = {}
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
      meta: { width: "w-[64px]" }
    },
    {
      id: "workType",
      accessorKey: "workType",
      header: "Type",
      cell: ({ row }) => <WorkTypeCell workType={row.original.workType} />,
      enableHiding: false,
      meta: { width: "w-[64px]" }
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <TitleCell ticket={row.original} />,
      meta: { width: "min-w-0 flex-1" }
    },
    {
      id: "labels",
      accessorFn: (ticket) => ticket.labels.join(" "),
      header: "Labels",
      enableSorting: false,
      cell: ({ row }) => <LabelsCell ticket={row.original} />,
      meta: { width: "w-[156px]" }
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusCell status={row.original.status} />,
      sortingFn: (a, b) =>
        statusRank[a.original.status] - statusRank[b.original.status],
      meta: { width: "w-[132px]" }
    },
    {
      id: "owner",
      accessorFn: (ticket) => ticket.assignee?.name ?? "Unassigned",
      header: "Owner",
      cell: ({ row }) => <OwnerCell ticket={row.original} />,
      meta: { width: "w-[164px]" }
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <PriorityCell priority={row.original.priority} />,
      sortingFn: (a, b) =>
        priorityRank[a.original.priority] - priorityRank[b.original.priority],
      meta: { width: "w-[108px]" }
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-muted)]">
          {formatDueDate(row.original.dueDate)}
        </span>
      ),
      sortingFn: (a, b) =>
        (a.original.dueDate ?? "9999-12-31").localeCompare(
          b.original.dueDate ?? "9999-12-31"
        ),
      meta: { width: "w-[112px]" }
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-faint)]">
          {relTime(row.original.updatedAt)}
        </span>
      ),
      meta: { width: "w-[80px]" }
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
      meta: { width: "w-[44px]" }
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
      meta: { width: "w-[120px]" }
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
      meta: { width: "w-[128px]" }
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
      meta: { width: "w-[92px]" }
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block max-w-[320px] truncate text-[12px] text-[var(--text-muted)]">
          {row.original.description}
        </span>
      ),
      meta: { width: "w-[320px]" }
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
  dueDate: "Due Date",
  updatedAt: "Updated",
  attachments: "Files",
  area: "Area",
  component: "Component",
  estimate: "Estimate",
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
  description: false
}
