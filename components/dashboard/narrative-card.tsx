"use client"

import { AlertTriangle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardNarrative } from "@/lib/dashboard/dashboard-types"

const RISK_CONFIG = {
  low:    { Icon: CheckCircle,   color: "var(--status-done)" },
  medium: { Icon: Info,          color: "var(--status-progress)" },
  high:   { Icon: AlertTriangle, color: "var(--status-blocked)" },
}

export function NarrativeCard({
  narrative,
  loading,
  className,
}: {
  narrative?: DashboardNarrative | null
  loading?: boolean
  className?: string
}) {
  if (loading) {
    return (
      <div className={cn("rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
        <div className="mb-3 h-4 w-3/5 animate-pulse rounded bg-[var(--surface-3)]" />
        <div className="mb-2 h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (!narrative) {
    return (
      <div className={cn("rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
        <p className="text-[13px] text-[var(--text-faint)]">Summary unavailable. Metrics are still up to date.</p>
      </div>
    )
  }

  const { Icon, color } = RISK_CONFIG[narrative.riskLevel]

  return (
    <div className={cn("rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <div className="mb-3 flex items-start gap-2.5">
        <Icon size={15} style={{ color }} className="mt-0.5 shrink-0" />
        <h3 className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text)]">
          {narrative.headline}
        </h3>
      </div>
      <p className="mb-3.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{narrative.summary}</p>
      {narrative.attentionItems.length > 0 && (
        <ul className="space-y-1.5 border-t border-[var(--border)] pt-3">
          {narrative.attentionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-[var(--text-muted)]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
