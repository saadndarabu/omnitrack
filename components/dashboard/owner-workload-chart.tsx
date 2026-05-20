"use client"

import { cn } from "@/lib/utils"
import type { OwnerWorkload } from "@/lib/dashboard/dashboard-types"

export function OwnerWorkloadChart({
  data,
  className,
}: {
  data: OwnerWorkload[]
  className?: string
}) {
  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4", className)}>
        <p className="text-[13px] text-[var(--text-faint)]">No assigned work to show.</p>
      </div>
    )
  }
  const max = Math.max(...data.map((d) => d.active), 1)

  return (
    <div className={cn("rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4", className)}>
      <h3 className="mb-4 text-[12px] font-semibold tracking-[0.02em] text-[var(--text-muted)] uppercase">Owner Workload</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.ownerId} className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[10px] font-semibold text-[var(--text-muted)]">
              {d.initials}
            </div>
            <span className="w-[88px] shrink-0 truncate text-[12px] text-[var(--text-muted)]">
              {d.ownerName.split(" ")[0]}
            </span>
            <div className="flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]" style={{ height: 6 }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(d.active / max) * 100}%`,
                  background: d.blocked > 0 ? "var(--status-blocked)" : "var(--accent)",
                  opacity: 0.75,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-[var(--text-faint)]">
              {d.active}
            </span>
            {d.blocked > 0 && (
              <span className="rounded-md bg-[color-mix(in_srgb,var(--status-blocked)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--status-blocked)]">
                {d.blocked}B
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
