"use client"

import { useState } from "react"

type Props = {
  installationId?: string
  label?: string
}

/**
 * Triggers POST /api/github/sync. Used on the setup and admin
 * pages. If installationId is provided, syncs only that one.
 */
export function SyncReposButton({ installationId, label = "Sync repositories" }: Props) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function onClick() {
    setBusy(true)
    setResult(null)
    try {
      const body = installationId ? { installationId: Number(installationId) } : {}
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setResult(`Error: ${data.error ?? res.statusText}`)
      } else {
        setResult(
          `Synced ${data.repositoriesSynced ?? 0} repositor${
            (data.repositoriesSynced ?? 0) === 1 ? "y" : "ies"
          } across ${data.installationsProcessed ?? 0} installation(s).`
        )
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {busy ? "Syncing..." : label}
      </button>
      {result && (
        <span className="text-[12px] text-[var(--text-muted)]">{result}</span>
      )}
    </div>
  )
}
