"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import type { StatusCount } from "@/lib/dashboard/dashboard-types"

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StatusCount; value: number }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border-[0.5px] border-[var(--border-strong)] bg-[var(--surface-3)] px-3 py-2 text-[12px] shadow-lg">
      <span className="font-medium text-[var(--text)]">{d.label}</span>
      <span className="ml-2 text-[var(--text-faint)]">{d.count}</span>
    </div>
  )
}

export function StatusDistributionChart({
  data,
  className,
}: {
  data: StatusCount[]
  className?: string
}) {
  if (!data.length) return null
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <div className={cn("rounded border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5", className)}>
      <h3 className="mb-4 text-[13px] font-semibold text-[var(--text)]">Work by Status</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "color-mix(in_srgb,var(--surface-3) 60%,transparent)" }} />
          <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={22}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
