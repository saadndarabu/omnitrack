"use client"

import { cn } from "@/lib/utils"
import { STATUS_LABELS } from "@/lib/status"
import type { TicketSummary } from "@/lib/dashboard/dashboard-types"

const PRIORITY_DOT: Record<string, string> = {
  critical: "var(--status-blocked)",
  high:     "var(--status-progress)",
  medium:   "var(--status-review)",
  low:      "var(--text-faint)",
}

const STATUS_COLOR: Record<string, string> = {
  backlog:     "var(--text-faint)",
  todo:        "var(--text-faint)",
  in_progress: "var(--status-progress)",
  in_review:   "var(--status-review)",
  done:        "var(--status-done)",
  blocked:     "var(--status-blocked)",
}

function dueDateLabel(dueDate: string | null): { text: string; warn: boolean } | null {
  if (!dueDate) return null
  const d = new Date(dueDate)
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, warn: true }
  if (diff === 0) return { text: "Due today", warn: true }
  if (diff <= 7)  return { text: `Due in ${diff}d`, warn: diff <= 2 }
  return null
}

function TicketRow({ ticket }: { ticket: TicketSummary }) {
  const due = dueDateLabel(ticket.dueDate)
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: PRIORITY_DOT[ticket.priority] ?? "var(--text-faint)" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--text)]">{ticket.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-faint)]">
          <span className="font-mono">{ticket.id}</span>
          <span style={{ color: STATUS_COLOR[ticket.status] ?? "var(--text-faint)" }}>
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
          {ticket.assigneeName && <span>{ticket.assigneeName}</span>}
          {due && (
            <span className={cn("font-medium", due.warn ? "text-[var(--status-progress)]" : "")}>
              {due.text}
            </span>
          )}
          {ticket.blockerReason && (
            <span className="truncate text-[var(--status-blocked)]">{ticket.blockerReason}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TicketListCard({
  title,
  tickets,
  emptyMessage = "Nothing here.",
  className,
}: {
  title: string
  tickets: TicketSummary[]
  emptyMessage?: string
  className?: string
}) {
  return (
    <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <h3 className="mb-1 text-[13px] font-semibold text-[var(--text)]">{title}</h3>
      {tickets.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-faint)]">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  )
}
