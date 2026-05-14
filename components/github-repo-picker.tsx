"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

type Repo = { full_name: string; label?: string | null }

export function GithubRepoPicker({ savedRepos }: { savedRepos: Repo[] }) {
  const [available, setAvailable] = useState<Repo[]>([])
  const [selected, setSelected] = useState<Set<string>>(
    new Set(savedRepos.map(r => r.full_name))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/github/repos")
      .then(r => r.json())
      .then((data: { repos?: Repo[]; error?: string }) => {
        if (data.repos) setAvailable(data.repos)
        else setFetchError(data.error ?? "Failed to load repos")
      })
      .catch(() => setFetchError("Failed to load repos"))
      .finally(() => setLoading(false))
  }, [])

  function toggle(fullName: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    const repos = [...selected].map(full_name => ({ full_name }))
    await fetch("/api/github/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repos })
    })
    setSaving(false)
    setSaved(true)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-faint)]">
        <Loader2 size={14} className="animate-spin" />
        Loading repositories…
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-[13px] text-red-400">{fetchError}</p>
  }

  if (available.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-faint)]">
        No repositories found on your GitHub account.
      </p>
    )
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-[var(--text-muted)]">
        Select the repositories the team can target when creating branches and PRs.
      </p>
      <ul className="mb-4 max-h-72 space-y-1 overflow-y-auto">
        {available.map(repo => {
          const checked = selected.has(repo.full_name)
          return (
            <li key={repo.full_name}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(repo.full_name)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <span className="font-mono text-[12px] text-[var(--text)]">{repo.full_name}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span className="text-[12px] text-[var(--text-faint)]">Saved.</span>
        )}
      </div>
    </div>
  )
}
