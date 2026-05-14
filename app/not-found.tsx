import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[420px] rounded-xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
        <h1 className="mb-2 text-[14px] font-medium text-[var(--text)]">
          Ticket not found
        </h1>
        <p className="mb-4 text-[13px] text-[var(--text-muted)]">
          The ticket link does not match a SECC ticket.
        </p>
        <Link
          href="/tickets"
          className="inline-flex h-8 items-center rounded-md bg-[var(--surface-2)] px-3 text-[13px] font-medium text-[var(--text)] transition-[filter] duration-[120ms] ease-out hover:brightness-110"
        >
          Back to tickets
        </Link>
      </div>
    </main>
  )
}
