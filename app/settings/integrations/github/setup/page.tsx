/**
 * GitHub App setup landing page.
 *
 * Reached via the App's callback / setup URL after install or
 * reconfigure. Reads ?status= and renders the appropriate state.
 */

export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { SyncReposButton } from "@/components/github/sync-repos-button"

type SearchParams = {
  status?: string
  installation_id?: string
  message?: string
}

const STATUS_COPY: Record<string, { title: string; tone: "ok" | "warn" | "error"; description: string }> = {
  success: {
    title: "GitHub App connected",
    tone: "ok",
    description: "Repositories have been synced and webhooks are live."
  },
  updated: {
    title: "GitHub App updated",
    tone: "ok",
    description: "Installation has been updated and repositories re-synced."
  },
  missing_installation: {
    title: "No installation found",
    tone: "warn",
    description: "GitHub redirected here without an installation id. Try installing the app again."
  },
  invalid_installation: {
    title: "Invalid installation id",
    tone: "warn",
    description: "The installation id returned by GitHub was not a number. Try again."
  },
  error: {
    title: "Setup failed",
    tone: "error",
    description: "Something went wrong while completing setup. See the message below."
  }
}

export default async function GitHubSetupPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect("/login?next=/settings/integrations/github/setup")

  const status = params.status ?? (params.installation_id ? "success" : "unknown")
  const copy = STATUS_COPY[status] ?? {
    title: "GitHub App setup",
    tone: "warn" as const,
    description: "Install the GitHub App on the repositories you want OmniTrack to manage."
  }

  const appSlug = process.env.GITHUB_APP_SLUG ?? ""
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new`
    : null

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">
        GitHub App
      </h1>
      <p className="mt-1 text-[13px] text-[var(--text-muted)]">
        Installation status for the OmniTrack GitHub App.
      </p>

      <section
        className={`mt-6 rounded-xl border p-5 ${
          copy.tone === "ok"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : copy.tone === "error"
              ? "border-red-500/30 bg-red-500/5"
              : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <h2 className="text-[15px] font-semibold text-[var(--text)]">{copy.title}</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{copy.description}</p>

        {params.installation_id && (
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            Installation id:{" "}
            <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">{params.installation_id}</code>
          </p>
        )}

        {params.message && (
          <p className="mt-2 break-words text-[12px] text-red-500">{params.message}</p>
        )}
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-3">
        <SyncReposButton installationId={params.installation_id} />

        {installUrl && (
          <Link
            href={installUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Manage / install on more repos
          </Link>
        )}

        <Link
          href="/settings/integrations/github"
          className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
        >
          Go to GitHub integration settings
        </Link>
      </section>
    </main>
  )
}
