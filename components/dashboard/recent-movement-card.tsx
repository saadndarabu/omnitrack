"use client"

import { cn } from "@/lib/utils"
import { STATUS_LABELS } from "@/lib/status"
import type { TicketSummary } from "@/lib/dashboard/dashboard-types"

const STATUS_COLOR: Record<string, string> = {
  backlog:     "#849495",
  todo:        "#849495",
  in_progress: "#e8c423",
  in_review:   "#d3bbff",
  done:        "#63D68A",
  blocked:     "#F06F82",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function RecentMovementCard({
  tickets,
  className,
}: {
  tickets: TicketSummary[]
  className?: string
}) {
  return (
    <div className={cn("rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4", className)}>
      <h3 className="mb-3 text-[12px] font-semibold tracking-[0.02em] text-[var(--text-muted)] uppercase">Recent Movement</h3>
      {tickets.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--text-faint)]">No recent activity.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: STATUS_COLOR[t.status] ?? "#849495" }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-muted)]">
                <span className="font-mono text-[var(--text-faint)]">{t.id} </span>
                {t.title}
              </span>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: STATUS_COLOR[t.status],
                  background: `color-mix(in_srgb,${STATUS_COLOR[t.status]} 12%,transparent)`,
                }}
              >
                {STATUS_LABELS[t.status] ?? t.status}
              </span>
              <span className="shrink-0 text-[11px] text-[var(--text-faint)]">
                {relativeTime(t.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
