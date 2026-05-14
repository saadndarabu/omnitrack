"use client"

import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Moon,
  Sun
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

const primaryItems = [
  { label: "Dashboard", Icon: LayoutDashboard, href: "/dashboard" },
  { label: "Tasks", Icon: ListTodo, href: "/tickets" },
  { label: "Projects", Icon: FolderKanban, href: "#" }
]

export function Sidebar({
  current = "Tasks",
  expanded,
  onExpandedChange
}: {
  current?: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}) {
  const { theme, toggle } = useTheme()
  return (
    <aside
      data-expanded={expanded}
      className={cn(
        "fixed inset-y-0 left-0 z-20 hidden border-r-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_90%,var(--bg))] py-3 backdrop-blur transition-[width] duration-200 ease-out md:block",
        expanded ? "w-[232px] px-3" : "w-[76px] px-2"
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "mb-4 flex h-11 items-center rounded-lg",
            expanded ? "justify-between gap-3 px-2" : "justify-center"
          )}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-[0.5px] border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,var(--surface-2))] text-[14px] font-semibold text-[var(--accent-strong)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text)_8%,transparent)]">
            S
          </span>

          {expanded ? (
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-4 text-[var(--text)]">
                SECC
              </span>
              <span className="block truncate text-[11px] font-medium leading-4 text-[var(--text-faint)]">
                Engineering command
              </span>
            </span>
          ) : null}
        </div>

        <nav aria-label="Workspace navigation" className="space-y-1.5">
          {primaryItems.map(({ label, Icon, href }) => {
            const active = label === current
            return (
              <a
                key={label}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                className={cn(
                  "group flex h-11 items-center rounded-lg text-[13px] font-medium text-[var(--text-muted)] transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] hover:text-[var(--text)]",
                  expanded ? "gap-3 px-2.5" : "justify-center px-0",
                  active &&
                    "bg-[color-mix(in_srgb,var(--surface-2)_84%,var(--bg))] text-[var(--text)] shadow-[inset_0_0_0_0.5px_var(--border)]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[0.5px] border-transparent transition-colors",
                    active
                      ? "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                      : "bg-[color-mix(in_srgb,var(--surface-2)_40%,transparent)] group-hover:border-[var(--border)]"
                  )}
                >
                  <Icon
                    size={19}
                    strokeWidth={2.1}
                    className={cn(
                      "text-[var(--text-muted)] transition-colors",
                      active && "text-[var(--accent)]"
                    )}
                  />
                </span>
                {expanded ? <span className="truncate">{label}</span> : null}
              </a>
            )
          })}
        </nav>

        <div className="mt-auto" />

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className={cn(
            "mb-2 flex h-10 items-center rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            expanded ? "justify-between px-2.5" : "justify-center px-0"
          )}
        >
          {expanded ? <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span> : null}
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          className={cn(
            "mt-4 flex h-10 items-center rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
            expanded ? "justify-between px-2.5" : "justify-center px-0"
          )}
        >
          {expanded ? <span>Collapse</span> : null}
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </aside>
  )
}
