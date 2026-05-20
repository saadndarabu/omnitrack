"use client"

import { cn } from "@/lib/utils"
import type { MetricCard } from "@/lib/dashboard/dashboard-types"

const TONE_STYLES = {
  neutral:  "text-[var(--text)]",
  good:     "text-[var(--status-done)]",
  warn:     "text-[var(--status-progress)]",
  critical: "text-[var(--status-blocked)]",
}

const TONE_TEXT = {
  neutral:  "text-[var(--text-muted)]",
  good:     "text-[var(--status-done)]",
  warn:     "text-[var(--status-progress)]",
  critical: "text-[var(--status-blocked)]",
}

export function MetricCardWidget({ metric, className }: { metric: MetricCard; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5",
        className
      )}
    >
      <span className="text-[11px] font-medium tracking-[0.04em] text-[var(--text-faint)] uppercase">
        {metric.label}
      </span>
      <span className={cn("text-[26px] font-semibold leading-none tabular-nums tracking-[-0.02em]", TONE_STYLES[metric.tone])}>
        {metric.value}
      </span>
      {metric.context && (
        <span className={cn("text-[12px] leading-snug", TONE_TEXT[metric.tone])}>
          {metric.context}
        </span>
      )}
    </div>
  )
}
