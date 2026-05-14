const TICKET_ID_PATTERN = /^SIRP-(\d{1,6})$/i
const TICKET_ID_IN_TEXT_PATTERN = /\b(SIRP-\d{1,6})\b/i

export function makeTicketId(value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Ticket number must be a positive integer")
  }

  return `SIRP-${value}`
}

export function parseTicketNumber(ticketId: string): number | null {
  const match = TICKET_ID_PATTERN.exec(ticketId.trim())
  return match ? Number(match[1]) : null
}

export function parseTicketIdFromText(value: string): string | null {
  const match = TICKET_ID_IN_TEXT_PATTERN.exec(value)
  return match ? match[1].toUpperCase() : null
}

export function nextTicketId(ticketIds: string[]): string {
  const highest = ticketIds.reduce((max, ticketId) => {
    const parsed = parseTicketNumber(ticketId)
    return parsed && parsed > max ? parsed : max
  }, 0)

  return makeTicketId(highest + 1)
}

export function toBranchName(type: "task", ticketId: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)

  return `${type}/${ticketId}-${slug || "ticket"}`
}
