"use client"

import { Columns3, List, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TicketViewMode = "table" | "kanban" | "list"

const VIEWS: { id: TicketViewMode; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "kanban", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: List },
]

export function TicketViewSwitcher({
  value,
  onChange
}: {
  value: TicketViewMode
  onChange: (value: TicketViewMode) => void
}) {
  return (
    <div className="flex items-end gap-0.5 px-3 sm:px-6 lg:px-8 mx-auto w-full max-w-[1440px]">
      {VIEWS.map((view) => {
        const Icon = view.icon
        const active = value === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-faint)] hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
            )}
          >
            <Icon size={13} />
            {view.label}
          </button>
        )
      })}
      <div className="flex-1 border-b-2 border-[var(--border)]" />
    </div>
  )
}
