"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { StatusIcon } from "@/components/status-icon"
import { STATUS_LABELS } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Ticket } from "@/types/ticket"

export function CommandMenu({
  open,
  tickets,
  onSelectTicket,
  onOpenChange
}: {
  open: boolean
  tickets: Ticket[]
  onSelectTicket: (ticketId: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return tickets
    }

    return tickets.filter((ticket) => {
      const haystack = [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.workType,
        ticket.priority,
        ticket.area,
        ticket.component,
        STATUS_LABELS[ticket.status],
        ticket.assignee?.name ?? "",
        ticket.assignee?.email ?? "",
        ticket.labels.join(" ")
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [query, tickets])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedIndex(0)
      return
    }

    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!open) {
    return null
  }

  function openTicket(ticketId: string) {
    onOpenChange(false)
    onSelectTicket(ticketId)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(15,15,15,0.32)] px-4 pt-24"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex h-11 items-center gap-2.5 border-b border-[var(--border)] px-3.5">
          <Search size={16} className="text-[var(--text-faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                onOpenChange(false)
              }

              if (event.key === "ArrowDown") {
                event.preventDefault()
                setSelectedIndex((index) => Math.min(index + 1, results.length - 1))
              }

              if (event.key === "ArrowUp") {
                event.preventDefault()
                setSelectedIndex((index) => Math.max(index - 1, 0))
              }

              if (event.key === "Enter") {
                event.preventDefault()
                const ticket = results[selectedIndex]
                if (ticket) {
                  openTicket(ticket.id)
                }
              }
            }}
            placeholder="Search tickets"
            className="h-full flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none"
          />
        </div>
        <div className="max-h-[416px] overflow-y-auto p-2">
          {results.length > 0 ? (
            results.map((ticket, index) => {
              const selected = index === selectedIndex
              return (
                <button
                  key={ticket.id}
                  type="button"
                  aria-selected={selected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openTicket(ticket.id)}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded-[6px] px-2.5 text-left transition-colors duration-150",
                    selected
                      ? "bg-[var(--surface-2)]"
                      : "hover:bg-[var(--surface-2)]"
                  )}
                >
                  <StatusIcon status={ticket.status} />
                  <span className="w-[60px] shrink-0 font-mono text-[11px] text-[var(--text-faint)]">
                    {ticket.id}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-[var(--text)]">
                    {ticket.title}
                  </span>
                  <span className="hidden text-[11px] text-[var(--text-muted)] sm:inline">
                    {STATUS_LABELS[ticket.status]}
                  </span>
                  <Avatar user={ticket.assignee} />
                </button>
              )
            })
          ) : (
            <div className="px-3 py-8 text-center text-[13px] text-[var(--text-muted)]">
              No matching tickets
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
