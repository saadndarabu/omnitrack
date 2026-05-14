"use client"

import { cn } from "@/lib/utils"
import type { DashboardRange } from "@/lib/dashboard/dashboard-types"

const LABELS: Record<DashboardRange, string> = {
  this_week: "This week",
  "7d":      "Last 7 days",
  "30d":     "Last 30 days",
}

export function DateRangeToggle({
  range,
  onChange,
}: {
  range: DashboardRange
  onChange: (r: DashboardRange) => void
}) {
  return (
    <div className="flex rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {(Object.keys(LABELS) as DashboardRange[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
            range === r
              ? "bg-[var(--surface-3)] text-[var(--text)]"
              : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
          )}
        >
          {LABELS[r]}
        </button>
      ))}
    </div>
  )
}
