"use client"

import type { ReactNode } from "react"
import { Columns3, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TicketViewMode = "table" | "kanban"

export function TicketViewSwitcher({
  value,
  onChange
}: {
  value: TicketViewMode
  onChange: (value: TicketViewMode) => void
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border-[0.5px] border-[var(--border)] bg-[var(--bg)] p-0.5">
      <ViewButton active={value === "table"} onClick={() => onChange("table")}>
        <Table2 size={13} />
        Table
      </ViewButton>
      <ViewButton active={value === "kanban"} onClick={() => onChange("kanban")}>
        <Columns3 size={13} />
        Kanban
      </ViewButton>
    </div>
  )
}

function ViewButton({
  active,
  children,
  onClick
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded px-2 text-[12px] font-medium transition-colors",
        active
          ? "bg-[var(--surface-2)] text-[var(--text)] shadow-[inset_0_0_0_0.5px_var(--border-strong)]"
          : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
      )}
    >
      {children}
    </button>
  )
}
