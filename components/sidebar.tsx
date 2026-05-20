"use client"

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Link2,
  ListTodo,
  UserCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const primaryItems = [
  { label: "Dashboard",   Icon: LayoutDashboard, href: "/dashboard" },
  { label: "All Tickets", Icon: ListTodo,        href: "/tickets" },
  { label: "Backlog",     Icon: Archive,         href: "/backlog" },
]

const bottomItems = [
  { label: "Profile",    Icon: UserCircle, href: "/profile" },
  { label: "Connectors", Icon: Link2,      href: "/connectors" },
]

export function Sidebar({
  current = "Dashboard",
  expanded,
  onExpandedChange,
  githubConnected = false,
}: {
  current?: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  githubConnected?: boolean
}) {
  return (
    <aside
      data-expanded={expanded}
      className={cn(
        "fixed inset-y-0 left-0 z-20 hidden border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ease-out md:block",
        expanded ? "w-[224px]" : "w-[64px]"
      )}
    >
      {/* Collapse/expand toggle */}
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={expanded}
        className="absolute -right-3 top-9 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-muted)]"
      >
        {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      <div className={cn("flex h-full flex-col", expanded ? "px-3" : "px-2.5")}>
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 items-center",
            expanded ? "gap-2.5 px-1" : "justify-center"
          )}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--text)] text-[12px] font-semibold tracking-tight text-[var(--bg)]">
            S
          </span>
          {expanded ? (
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text)]">
                SECC
              </span>
              <span className="block truncate text-[11px] leading-tight text-[var(--text-faint)]">
                Engineering command
              </span>
            </span>
          ) : null}
        </div>

        {/* Primary navigation */}
        <nav aria-label="Workspace navigation" className="mt-2 flex flex-col gap-0.5">
          {primaryItems.map(({ label, Icon, href }) => {
            const active = label === current
            return (
              <a
                key={label}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center rounded-[6px] text-[13px] font-medium transition-colors duration-150",
                  expanded ? "gap-2.5 px-2" : "justify-center px-0",
                  active
                    ? "bg-[var(--surface-2)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                )}
              >
                {active ? (
                  <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-[var(--text)]" />
                ) : null}
                <Icon
                  size={15}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={cn("shrink-0", active ? "text-[var(--text)]" : "text-[var(--text-faint)] group-hover:text-[var(--text-muted)]")}
                />
                {expanded ? <span className="truncate">{label}</span> : null}
              </a>
            )
          })}
        </nav>

        <div className="mt-auto" />

        {/* Bottom: Profile + Connectors */}
        <nav aria-label="Account navigation" className="mb-3 flex flex-col gap-0.5">
          {bottomItems.map(({ label, Icon, href }) => {
            const active = label === current
            const isConnectors = label === "Connectors"
            const showGreen = isConnectors && githubConnected
            return (
              <a
                key={label}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center rounded-[6px] text-[13px] font-medium transition-colors duration-150",
                  expanded ? "gap-2.5 px-2" : "justify-center px-0",
                  active
                    ? "bg-[var(--surface-2)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                )}
              >
                {active ? (
                  <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-[var(--text)]" />
                ) : null}
                <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={cn(active ? "text-[var(--text)]" : "text-[var(--text-faint)] group-hover:text-[var(--text-muted)]")}
                  />
                  {showGreen && (
                    <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--status-done)] ring-2 ring-[var(--surface)]" />
                  )}
                </span>
                {expanded ? (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-1 truncate">
                    <span className="truncate">{label}</span>
                    {showGreen && (
                      <span className="shrink-0 text-[10px] font-medium text-[var(--status-done)]">
                        Connected
                      </span>
                    )}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
