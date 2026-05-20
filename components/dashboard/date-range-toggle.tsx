"use client"

import { cn } from "@/lib/utils"
import type { DashboardRange } from "@/lib/dashboard/dashboard-types"

const LABELS: Record<DashboardRange, string> = {
  this_week: "This week",
  "7d":      "7d",
  "30d":     "30d",
}

export function DateRangeToggle({
  range,
  onChange,
}: {
  range: DashboardRange
  onChange: (r: DashboardRange) => void
}) {
  return (
    <div className="inline-flex h-7 items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-[2px]">
      {(Object.keys(LABELS) as DashboardRange[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "h-[22px] rounded-[4px] px-2 text-[12px] font-medium transition-colors duration-150",
            range === r
              ? "bg-[var(--surface-2)] text-[var(--text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          {LABELS[r]}
        </button>
      ))}
    </div>
  )
}
