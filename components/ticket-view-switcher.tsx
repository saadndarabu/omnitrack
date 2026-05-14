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
    <div className="flex items-center gap-0.5">
      <span className="mr-1.5 text-[11px] font-medium text-[var(--text-faint)]">View as</span>
      {VIEWS.map((view) => {
        const Icon = view.icon
        const active = value === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
              active
                ? "bg-[var(--surface-2)] text-[var(--text)] shadow-[inset_0_0_0_0.5px_var(--border-strong)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
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
