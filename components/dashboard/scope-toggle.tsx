"use client"

import { cn } from "@/lib/utils"
import type { DashboardScope } from "@/lib/dashboard/dashboard-types"

export function ScopeToggle({
  scope,
  onChange,
}: {
  scope: DashboardScope
  onChange: (s: DashboardScope) => void
}) {
  return (
    <div className="inline-flex h-7 items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-[2px]">
      {(["my", "team"] as DashboardScope[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "h-[22px] rounded-[4px] px-2.5 text-[12px] font-medium transition-colors duration-150",
            scope === s
              ? "bg-[var(--surface-2)] text-[var(--text)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          {s === "my" ? "My work" : "Team"}
        </button>
      ))}
    </div>
  )
}
