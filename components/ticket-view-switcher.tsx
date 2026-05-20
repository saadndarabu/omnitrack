"use client"

import { Columns3, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TicketViewMode = "table" | "kanban"

const VIEWS: { id: TicketViewMode; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "kanban", label: "Board", icon: Columns3 },
]

export function TicketViewSwitcher({
  value,
  onChange
}: {
  value: TicketViewMode
  onChange: (value: TicketViewMode) => void
}) {
  return (
    <div className="inline-flex h-7 items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-[2px]">
      {VIEWS.map((view) => {
        const Icon = view.icon
        const active = value === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-[22px] items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-medium transition-colors",
              active
                ? "bg-[var(--surface-2)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            <Icon size={12} />
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
