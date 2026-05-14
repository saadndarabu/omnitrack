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
    <div className="flex rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {(["my", "team"] as DashboardScope[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors duration-150",
            scope === s
              ? "bg-[var(--surface-3)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
          )}
        >
          {s === "my" ? "My Dashboard" : "Team Dashboard"}
        </button>
      ))}
    </div>
  )
}
