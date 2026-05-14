"use client"

import { AlertTriangle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardNarrative } from "@/lib/dashboard/dashboard-types"

const RISK_CONFIG = {
  low:    { Icon: CheckCircle,   color: "var(--status-done)",    bg: "color-mix(in_srgb,var(--status-done) 8%,transparent)" },
  medium: { Icon: Info,          color: "var(--status-progress)", bg: "color-mix(in_srgb,var(--status-progress) 8%,transparent)" },
  high:   { Icon: AlertTriangle, color: "var(--status-blocked)",  bg: "color-mix(in_srgb,var(--status-blocked) 8%,transparent)" },
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
      <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-6", className)}>
        <div className="mb-3 h-4 w-3/5 animate-pulse rounded-md bg-[var(--surface-3)]" />
        <div className="mb-2 h-3 w-full animate-pulse rounded-md bg-[var(--surface-2)]" />
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (!narrative) {
    return (
      <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-6", className)}>
        <p className="text-[13px] text-[var(--text-faint)]">Summary unavailable. Metrics are still up to date.</p>
      </div>
    )
  }

  const { Icon, color, bg } = RISK_CONFIG[narrative.riskLevel]

  return (
    <div
      className={cn("rounded border-[0.5px] bg-[var(--surface)] p-6", className)}
      style={{ borderColor: `color-mix(in_srgb,${color} 30%,var(--border))` }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: bg }}>
          <Icon size={15} style={{ color }} />
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-[var(--text)]">{narrative.headline}</h3>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-muted)]">{narrative.summary}</p>
      {narrative.attentionItems.length > 0 && (
        <ul className="space-y-1.5">
          {narrative.attentionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-faint)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
