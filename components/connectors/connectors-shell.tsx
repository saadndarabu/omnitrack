"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { GitHubIcon } from "@/components/connectors/github-icon"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Link2, Loader2, Unlink } from "lucide-react"
import type { User } from "@/types/user"
import { cn } from "@/lib/utils"

export function ConnectorsShell({ user: initialUser }: { user: User }) {
  const [user,    setUser]    = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const searchParams          = useSearchParams()
  const didSyncRef            = useRef(false)

  // After GitHub OAuth redirect, link=github is present in the URL.
  // The session is now fully established client-side, so we can safely
  // read the GitHub identity and persist it.
  useEffect(() => {
    if (didSyncRef.current) return
    if (searchParams.get("link") !== "github") return
    if (user.githubUsername) return // already synced

    didSyncRef.current = true
    setLoading(true)

    async function syncGitHub() {
      try {
        const supabase = createSupabaseBrowserClient()
        let { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) throw new Error("Not authenticated")

        // After linkIdentity the browser session may not yet carry the GitHub
        // identity — force a refresh so identities[] is up to date.
        if (!authUser.identities?.find(i => i.provider === "github")) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed.user) authUser = refreshed.user
        }

        const githubIdentity = authUser.identities?.find(i => i.provider === "github")
        const identityData   = githubIdentity?.identity_data ?? {}

        const githubUsername =
          (identityData["user_name"]          as string | undefined) ??
          (identityData["preferred_username"]  as string | undefined) ??
          (identityData["login"]               as string | undefined) ??
          ""
        const githubEmail =
          (identityData["email"] as string | undefined) ?? ""

        if (!githubUsername) throw new Error("Could not read GitHub username from session")

        const res = await fetch("/api/users/me/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ github_username: githubUsername, github_email: githubEmail }),
        })

        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? "Failed to save GitHub connection")
        }

        setUser(prev => ({
          ...prev,
          githubUsername,
          githubEmail,
          githubConnectedAt: new Date().toISOString(),
        }))

        // Clean link param from URL without reload
        const url = new URL(window.location.href)
        url.searchParams.delete("link")
        window.history.replaceState({}, "", url.toString())
      } catch (err) {
        setError(err instanceof Error ? err.message : "GitHub sync failed")
      } finally {
        setLoading(false)
      }
    }

    syncGitHub()
  }, [searchParams, user.githubUsername])

  const connected = !!user.githubUsername

  async function handleConnect() {
    setError(null)
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      // linkIdentity links GitHub to the existing session without replacing it.
      // signInWithOAuth would create a new session and lose the Google session.
      const { error: oauthError } = await supabase.auth.linkIdentity({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/connectors&link=github`,
          scopes: "read:user user:email",
        },
      })
      if (oauthError) throw oauthError
      // Page navigates away to GitHub — no further state update needed
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not initiate GitHub connection")
      setLoading(false)
    }
  }

  async function handleDisconnect() {
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
    ? new Date(user.githubConnectedAt).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric"
      })
    : null

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          Connectors
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Link external accounts to enhance your workflow.
        </p>
      </div>

      {/* GitHub card */}
      <div
        className={cn(
          "rounded-2xl border bg-[var(--surface-2)] p-5 transition-colors",
          connected ? "border-[var(--border-strong)]" : "border-[var(--border)]"
        )}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <GitHubIcon size={20} className="text-[var(--text)]" />
          </span>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[var(--text)]">GitHub</span>
              {connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--status-done)_14%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-done)]">
                  <CheckCircle2 size={10} />
                  Connected
                </span>
              )}
            </div>

            {connected ? (
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
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Connecting…
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Link your GitHub account to associate commits and PRs with your profile.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="shrink-0">
            {connected ? (
              <Button
                variant="quiet"
                onClick={handleDisconnect}
                disabled={loading}
                className="text-[var(--status-blocked)] hover:text-[var(--status-blocked)]"
              >
                {loading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Unlink size={14} /> Disconnect</>
                }
              </Button>
            ) : (
              <Button variant="primary" onClick={handleConnect} disabled={loading}>
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
    </div>
  )
}
