"use client"

import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Link2,
  ListTodo,
  User,
  UserCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const primaryItems = [
  { label: "Dashboard",  Icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Tickets", Icon: User,            href: "/my" },
  { label: "All Tickets",Icon: ListTodo,        href: "/tickets" },
  { label: "Projects",   Icon: FolderKanban,    href: "#" },
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
        "fixed inset-y-0 left-0 z-20 hidden border-r border-[var(--border)] bg-[var(--surface-2)] py-3 transition-[width] duration-200 ease-out md:block",
        expanded ? "w-[232px] px-3" : "w-[76px] px-2"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "mb-5 flex h-11 items-center",
            expanded ? "justify-between gap-3 px-1" : "justify-center"
          )}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(17,24,39,0.18)]">
            S
          </span>

          {expanded ? (
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-4 tracking-[-0.02em] text-[var(--text)]">
                SECC
              </span>
              <span className="block truncate text-[11px] leading-4 text-[var(--text-faint)]">
                Engineering command
              </span>
            </span>
          ) : null}
        </div>

        {/* Primary navigation */}
        <nav aria-label="Workspace navigation" className="space-y-1">
          {primaryItems.map(({ label, Icon, href }) => {
            const active = label === current
            return (
              <a
                key={label}
                href={href}
                title={expanded ? undefined : label}
                aria-label={label}
                className={cn(
                  "group flex h-[42px] items-center rounded-[14px] text-[13px] font-medium transition-colors duration-[120ms] ease-out",
                  expanded ? "gap-3 px-2.5" : "justify-center px-0",
                  active
                    ? "bg-[#111827] text-white shadow-[0_8px_20px_rgba(17,24,39,0.12)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg transition-colors",
                    active ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                </span>
                {expanded ? <span className="truncate">{label}</span> : null}
              </a>
            )
          })}
        </nav>

        <div className="mt-auto" />

        {/* Bottom: Profile + Connectors */}
        <nav aria-label="Account navigation" className="mb-2 space-y-1">
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
                className={cn(
                  "group flex h-[38px] items-center rounded-[14px] text-[13px] font-medium transition-colors duration-[120ms] ease-out",
                  expanded ? "gap-3 px-2.5" : "justify-center px-0",
                  showGreen && !active
                    ? "text-[#16a34a] hover:bg-[var(--surface-3)] hover:text-[#16a34a]"
                    : active
                    ? "bg-[#111827] text-white shadow-[0_8px_20px_rgba(17,24,39,0.12)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg transition-colors",
                    showGreen && !active
                      ? "text-[#16a34a]"
                      : active
                      ? "text-white"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text)]"
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                  {showGreen && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#16a34a] ring-2 ring-[var(--surface-2)]" />
                  )}
                </span>
                {expanded ? (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-1 truncate">
                    <span className="truncate">{label}</span>
                    {showGreen && (
                      <span className="shrink-0 rounded-full bg-[#16a34a]/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#16a34a]">
                        Connected
                      </span>
                    )}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          className={cn(
            "flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]",
            expanded ? "justify-between px-2.5" : "justify-center px-0"
          )}
        >
          {expanded ? <span>Collapse</span> : null}
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  )
}
