import { StatusIcon } from "@/components/status-icon"
import { TicketRow } from "@/components/ticket-row"
import { STATUS_LABELS, type Status } from "@/lib/status"
import type { Ticket } from "@/types/ticket"

export function StatusGroup({
  status,
  tickets,
  selectedId,
  onOpen
}: {
  status: Status
  tickets: Ticket[]
  selectedId: string | null
  onOpen?: (ticketId: string) => void
}) {
  if (tickets.length === 0) {
    return null
  }

  return (
    <section aria-label={STATUS_LABELS[status]} className="overflow-hidden rounded-lg border-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)]">
      <div className="flex h-10 items-center gap-2 border-b-[0.5px] border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] px-3 text-[12px] font-semibold text-[var(--text-muted)]">
        <StatusIcon status={status} size={14} />
        <span className="text-[var(--text)]">{STATUS_LABELS[status]}</span>
        <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
          {tickets.length}
        </span>
      </div>
      {tickets.map((ticket) => (
        <TicketRow
          key={ticket.id}
          ticket={ticket}
          selected={ticket.id === selectedId}
          onOpen={onOpen}
        />
      ))}
    </section>
  )
}
