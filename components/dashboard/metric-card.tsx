"use client"

import { cn } from "@/lib/utils"
import type { MetricCard } from "@/lib/dashboard/dashboard-types"

const TONE_STYLES = {
  neutral:  "text-[var(--text)]",
  good:     "text-[var(--status-done)]",
  warn:     "text-[var(--status-progress)]",
  critical: "text-[var(--status-blocked)]",
}

const BADGE_STYLES = {
  neutral:  "bg-[color-mix(in_srgb,var(--surface-3)_60%,transparent)] text-[var(--text-muted)]",
  good:     "bg-[color-mix(in_srgb,var(--status-done)_14%,transparent)] text-[var(--status-done)]",
  warn:     "bg-[color-mix(in_srgb,var(--status-progress)_14%,transparent)] text-[var(--status-progress)]",
  critical: "bg-[color-mix(in_srgb,var(--status-blocked)_14%,transparent)] text-[var(--status-blocked)]",
}

export function MetricCardWidget({ metric, className }: { metric: MetricCard; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5",
        className
      )}
    >
      <span className="text-[12px] font-medium tracking-wide text-[var(--text-faint)] uppercase">
        {metric.label}
      </span>
      <span className={cn("text-[36px] font-semibold leading-none tabular-nums", TONE_STYLES[metric.tone])}>
        {metric.value}
      </span>
      {metric.context && (
        <span className={cn("inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-medium", BADGE_STYLES[metric.tone])}>
          {metric.context}
        </span>
      )}
    </div>
  )
}
