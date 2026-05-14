import Link from "next/link"
import { Avatar } from "@/components/avatar"
import { GitPill } from "@/components/git-pill"
import { StatusIcon } from "@/components/status-icon"
import { Tag } from "@/components/tag"
import { relTime } from "@/lib/rel-time"
import { cn } from "@/lib/utils"
import type { Ticket } from "@/types/ticket"

export function TicketRow({
  ticket,
  selected,
  onOpen
}: {
  ticket: Ticket
  selected: boolean
  onOpen?: (ticketId: string) => void
}) {
  return (
    <Link
      href={`/t/${ticket.id}`}
      onClick={(event) => {
        if (onOpen) {
          event.preventDefault()
          onOpen(ticket.id)
        }
      }}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "grid min-h-[52px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b-[0.5px] border-[var(--border)] px-3 py-2 text-left leading-[1.3] transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_srgb,var(--surface-2)_74%,transparent)] focus-visible:focus-input focus-visible:outline-none sm:grid-cols-[auto_76px_minmax(0,1fr)_auto_auto] lg:grid-cols-[auto_76px_minmax(0,1fr)_minmax(180px,auto)_auto_auto]",
        selected &&
          "bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface))] shadow-[inset_2px_0_0_var(--accent)]"
      )}
    >
      <StatusIcon status={ticket.status} size={15} />
      <span className="hidden font-mono text-[11px] text-[var(--text-faint)] sm:block">
        {ticket.id}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-[var(--text)]">
          {ticket.title}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 sm:hidden">
          <span className="font-mono text-[11px] text-[var(--text-faint)]">{ticket.id}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--text-faint)]" />
          <span className="truncate text-[11px] text-[var(--text-faint)]">{ticket.project}</span>
        </span>
      </span>
      <span className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
        {ticket.labels.slice(0, 2).map((tag) => (
          <Tag key={tag} value={tag} className="bg-[var(--surface)]" />
        ))}
        {ticket.prNumber ? (
          <GitPill type="pr" value={ticket.prNumber} />
        ) : ticket.branch ? (
          <GitPill type="branch" value={ticket.branch} />
        ) : null}
      </span>
      <span className="hidden w-9 shrink-0 text-right text-[11px] text-[var(--text-faint)] sm:block">
        {relTime(ticket.updatedAt)}
      </span>
      <Avatar user={ticket.assignee} />
    </Link>
  )
}
