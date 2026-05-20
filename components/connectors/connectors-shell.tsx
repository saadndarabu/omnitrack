"use client"

import { useState, useEffect, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { GitHubIcon } from "@/components/connectors/github-icon"
import { SlackIcon } from "@/components/connectors/slack-icon"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Link2, Loader2, Unlink, Settings2, Send, ChevronDown } from "lucide-react"
import type { User } from "@/types/user"
import { isAdmin } from "@/types/user"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────

type SlackStatus =
  | { connected: false }
  | {
      connected:            true
      teamId:               string
      teamName:             string | null
      botUserId:            string | null
      defaultChannelId:     string | null
      defaultChannelName:   string | null
      approvalChannelId:    string | null
      approvalChannelName:  string | null
      connectedAt:          string
      connectedBy:          string | null
    }

type SlackChannel = { id: string; name: string; isPrivate: boolean }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })
}

// ── Channel selector ──────────────────────────────────────────────────────────

function ChannelSelect({
  channels,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  channels:    SlackChannel[]
  value:       string | null
  onChange:    (id: string, name: string) => void
  placeholder: string
  disabled:    boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = channels.find(c => c.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] transition hover:border-[var(--border-strong)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <span className={selected ? "text-[var(--text)]" : "text-[var(--text-faint)]"}>
          {selected ? `#${selected.name}` : placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]">
          <div className="max-h-52 overflow-y-auto">
            {channels.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-[var(--text-faint)]">No channels found</p>
            ) : (
              channels.map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => { onChange(ch.id, ch.name); setOpen(false) }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-[var(--surface-3)]",
                    ch.id === value && "bg-[var(--surface-3)] font-medium"
                  )}
                >
                  <span className="text-[var(--text-muted)]">#</span>
                  {ch.name}
                  {ch.isPrivate && (
                    <span className="ml-auto text-[11px] text-[var(--text-faint)]">private</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Slack card ─────────────────────────────────────────────────────────────────

function SlackCard() {
  const searchParams = useSearchParams()
  const [status,   setStatus]   = useState<SlackStatus | null>(null)
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [configOpen, setConfigOpen] = useState(false)

  const [defaultChannelId,    setDefaultChannelId]    = useState<string | null>(null)
  const [defaultChannelName,  setDefaultChannelName]  = useState<string | null>(null)
  const [approvalChannelId,   setApprovalChannelId]   = useState<string | null>(null)
  const [approvalChannelName, setApprovalChannelName] = useState<string | null>(null)

  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [loadingCh,   setLoadingCh]   = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch("/api/slack/status")
      const data = await res.json() as SlackStatus
      setStatus(data)
      if (data.connected) {
        setDefaultChannelId(data.defaultChannelId)
        setDefaultChannelName(data.defaultChannelName)
        setApprovalChannelId(data.approvalChannelId)
        setApprovalChannelName(data.approvalChannelName)
      }
    } catch {
      setStatus({ connected: false })
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Show toast if redirected back from Slack OAuth
  useEffect(() => {
    const slack = searchParams.get("slack")
    if (slack === "connected") showToast("Slack workspace connected successfully.")
    if (slack === "error") {
      const reason = searchParams.get("reason") ?? "unknown"
      showToast(`Slack connection failed: ${reason}`)
    }
  }, [searchParams])

  async function handleOpenConfig() {
    setConfigOpen(o => !o)
    if (!configOpen && channels.length === 0) {
      setLoadingCh(true)
      try {
        const res  = await fetch("/api/slack/channels")
        const data = await res.json() as SlackChannel[]
        setChannels(Array.isArray(data) ? data : [])
      } catch {
        showToast("Could not load Slack channels.")
      } finally {
        setLoadingCh(false)
      }
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      const res = await fetch("/api/slack/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultChannelId,
          defaultChannelName,
          approvalChannelId,
          approvalChannelName,
        }),
      })
      if (!res.ok) throw new Error()
      showToast("Channel settings saved.")
      setConfigOpen(false)
      await fetchStatus()
    } catch {
      showToast("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTestMessage() {
    const channelId = defaultChannelId
    if (!channelId) {
      showToast("Select a default channel first.")
      return
    }
    setTesting(true)
    try {
      const res = await fetch("/api/slack/test-message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      })
      if (!res.ok) throw new Error()
      showToast("Test message sent.")
    } catch {
      showToast("Failed to send test message.")
    } finally {
      setTesting(false)
    }
  }

  const connected = status?.connected === true

  return (
    <div
      className={cn(
        "rounded-[8px] border bg-[var(--surface)] transition-colors",
        connected ? "border-[var(--border-strong)]" : "border-[var(--border)]"
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)]">
          <SlackIcon size={20} />
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[var(--text)]">Slack</span>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-[4px] border border-[color-mix(in_srgb,var(--status-done)_30%,var(--border))] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--status-done)]">
                <CheckCircle2 size={10} />
                Connected
              </span>
            )}
          </div>

          {status === null ? (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Loading…</p>
          ) : connected && status.connected ? (
            <div className="mt-1 space-y-0.5">
              {status.teamName && (
                <p className="text-[13px] text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">{status.teamName}</span>
                </p>
              )}
              {status.defaultChannelName && (
                <p className="text-[12px] text-[var(--text-faint)]">
                  Default: #{status.defaultChannelName}
                  {status.approvalChannelName ? ` · Approvals: #${status.approvalChannelName}` : ""}
                </p>
              )}
              <p className="text-[12px] text-[var(--text-faint)]">
                Connected {formatDate(status.connectedAt)}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Connect your company Slack workspace to send ticket updates, approval requests, and engineering digests.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {status === null ? null : connected ? (
            <>
              <Button variant="quiet" onClick={handleTestMessage} disabled={testing || !defaultChannelId}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Test</>}
              </Button>
              <Button variant="quiet" onClick={handleOpenConfig}>
                <Settings2 size={14} />
                {configOpen ? "Close" : "Configure"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => { window.location.href = "/api/slack/oauth/start" }}
            >
              <Link2 size={14} /> Connect Slack Workspace
            </Button>
          )}
        </div>
      </div>

      {/* Channel config panel */}
      {configOpen && connected && (
        <div className="border-t border-[var(--border)] px-5 pb-5 pt-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.04em] text-[var(--text-faint)] uppercase">
            Channel Settings
          </p>

          {loadingCh ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading channels…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] text-[var(--text-muted)]">
                  Default engineering channel
                </label>
                <ChannelSelect
                  channels={channels}
                  value={defaultChannelId}
                  onChange={(id, name) => { setDefaultChannelId(id); setDefaultChannelName(name) }}
                  placeholder="Select channel…"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--text-muted)]">
                  Approval channel
                </label>
                <ChannelSelect
                  channels={channels}
                  value={approvalChannelId}
                  onChange={(id, name) => { setApprovalChannelId(id); setApprovalChannelName(name) }}
                  placeholder="Select channel…"
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={handleSaveSettings} disabled={saving || loadingCh}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="mx-5 mb-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text)]">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function ConnectorsShell({ user: initialUser }: { user: User }) {
  const [user,    setUser]    = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const githubConnected = !!user.githubUsername
  const userIsAdmin     = isAdmin(user)

  async function handleGitHubConnect() {
    setError(null)
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.linkIdentity({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/connectors&link=github`,
          scopes: "read:user user:email",
        },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not initiate GitHub connection")
      setLoading(false)
    }
  }

  async function handleGitHubDisconnect() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/users/me/github", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? "Disconnect failed")
      }
      setUser(prev => ({
        ...prev,
        githubUsername:    null,
        githubEmail:       null,
        githubConnectedAt: null,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect GitHub")
    } finally {
      setLoading(false)
    }
  }

  const connectedAt = user.githubConnectedAt
    ? formatDate(user.githubConnectedAt)
    : null

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text)]">
          Connectors
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Link external accounts to enhance your workflow.
        </p>
      </div>

      <div className="space-y-4">
        {/* GitHub card — personal, all users */}
        <div
          className={cn(
            "rounded-[8px] border bg-[var(--surface)] p-5 transition-colors",
            githubConnected ? "border-[var(--border-strong)]" : "border-[var(--border)]"
          )}
        >
          <div className="flex items-start gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)]">
              <GitHubIcon size={20} className="text-[var(--text)]" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[var(--text)]">GitHub</span>
                {githubConnected && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] border border-[color-mix(in_srgb,var(--status-done)_30%,var(--border))] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--status-done)]">
                    <CheckCircle2 size={10} />
                    Connected
                  </span>
                )}
              </div>

              {githubConnected ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[13px] text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">@{user.githubUsername}</span>
                    {user.githubEmail ? (
                      <span className="ml-2 text-[var(--text-faint)]">· {user.githubEmail}</span>
                    ) : null}
                  </p>
                  {connectedAt && (
                    <p className="text-[12px] text-[var(--text-faint)]">
                      Connected {connectedAt}
                    </p>
                  )}
                </div>
              ) : loading ? (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">Connecting…</p>
              ) : (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Link your GitHub account to associate commits and PRs with your profile.
                </p>
              )}
            </div>

            <div className="shrink-0">
              {githubConnected ? (
                <Button
                  variant="danger"
                  onClick={handleGitHubDisconnect}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Unlink size={14} /> Disconnect</>
                  }
                </Button>
              ) : (
                <Button variant="primary" onClick={handleGitHubConnect} disabled={loading}>
                  {loading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Link2 size={14} /> Connect</>
                  }
                </Button>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-[12px] text-[var(--status-blocked)]">{error}</p>
          )}
        </div>

        {/* Slack card — workspace-level, admins only */}
        {userIsAdmin ? (
          <SlackCard />
        ) : (
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)]">
                <SlackIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[14px] font-semibold text-[var(--text)]">Slack</span>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  Slack notifications are managed by your workspace admin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
