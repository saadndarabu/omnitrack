"use client"

import { cn } from "@/lib/utils"
import type { InitiativeCount } from "@/lib/dashboard/dashboard-types"

const ACCENT_COLORS = [
  "#00dbe7", "#d3bbff", "#e8c423", "#A78BFA", "#63D68A",
  "#00f2ff", "#fed83a", "#F06F82",
]

export function InitiativeDistributionCard({
  data,
  className,
}: {
  data: InitiativeCount[]
  className?: string
}) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <h3 className="mb-4 text-[13px] font-semibold text-[var(--text)]">Engineering Focus</h3>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-[96px] shrink-0 truncate text-[12px] capitalize text-[var(--text-muted)]">
              {d.name}
            </span>
            <div className="flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]" style={{ height: 5 }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((d.count / total) * 100, 3)}%`,
                  background: ACCENT_COLORS[i % ACCENT_COLORS.length],
                  opacity: 0.75,
                }}
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
