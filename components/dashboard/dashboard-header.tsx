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
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[var(--text)]">Dashboard</h1>
          <p className="mt-1 text-[13px] text-[var(--text-faint)]">
            Your engineering command center for focus, blockers, and delivery health.
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
              "flex h-[30px] items-center gap-1.5 rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]",
              loading && "opacity-50"
            )}
          >
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
            {syncedLabel ? `Synced ${syncedLabel}` : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  )
}
