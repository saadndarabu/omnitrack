"use client"

import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScopeToggle } from "./scope-toggle"
import { DateRangeToggle } from "./date-range-toggle"
import type { DashboardScope, DashboardRange } from "@/lib/dashboard/dashboard-types"

export function DashboardHeader({
  scope,
  range,
  generatedAt,
  loading,
  onScopeChange,
  onRangeChange,
  onRefresh,
}: {
  scope: DashboardScope
  range: DashboardRange
  generatedAt?: string
  loading: boolean
  onScopeChange: (s: DashboardScope) => void
  onRangeChange: (r: DashboardRange) => void
  onRefresh: () => void
}) {
  const syncedLabel = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null

  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text)]">Dashboard</h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {scope === "my"
            ? "Your work, blockers, and what to focus on next."
            : "Team workload, delivery health, and recent activity."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ScopeToggle scope={scope} onChange={onScopeChange} />
        <DateRangeToggle range={range} onChange={onRangeChange} />
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh dashboard"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]",
            loading && "opacity-50"
          )}
        >
          <RefreshCw size={11} className={cn(loading && "animate-spin")} />
          {syncedLabel ? `Synced ${syncedLabel}` : "Refresh"}
        </button>
      </div>
    </div>
  )
}
