"use client"

import { cn } from "@/lib/utils"
import type { PriorityCount } from "@/lib/dashboard/dashboard-types"

export function PriorityDistributionChart({
  data,
  className,
}: {
  data: PriorityCount[]
  className?: string
}) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <h3 className="mb-4 text-[13px] font-semibold text-[var(--text)]">Priority Mix</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.priority} className="flex items-center gap-3">
            <span className="w-[64px] shrink-0 text-[12px] font-medium" style={{ color: d.color }}>
              {d.label}
            </span>
            <div className="flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]" style={{ height: 6 }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max((d.count / total) * 100, 4)}%`, background: d.color, opacity: 0.8 }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-[var(--text-faint)]">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
