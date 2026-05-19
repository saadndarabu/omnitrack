/**
 * GitHub integration admin page.
 *
 * Shows current installations, repository counts, and a sync
 * action. Server-rendered with the user's Supabase session so
 * the listings respect RLS.
 */

export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { SyncReposButton } from "@/components/github/sync-repos-button"

export const metadata = { title: "GitHub — OmniTrack" }

export default async function GitHubIntegrationPage() {
  const db = await createSupabaseServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect("/login?next=/settings/integrations/github")

  const [{ data: installations }, { data: repositories }] = await Promise.all([
    db
      .from("github_installations")
      .select("installation_id, account_login, account_type, repository_selection, app_slug, suspended_at, created_at, updated_at")
      .order("created_at", { ascending: false }),
    db
      .from("github_repositories")
      .select("id, github_repo_id, installation_id, full_name, default_branch, private, html_url, enabled, updated_at")
      .eq("enabled", true)
      .order("full_name")
  ])

  const installs = installations ?? []
  const repos = repositories ?? []
  const appSlug = process.env.GITHUB_APP_SLUG ?? ""
  const installUrl = appSlug ? `https://github.com/apps/${appSlug}/installations/new` : null

  const lastSynced = repos.reduce<string | null>((latest, r) => {
    if (!r.updated_at) return latest
    if (!latest) return r.updated_at
    return r.updated_at > latest ? r.updated_at : latest
  }, null)

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          GitHub integration
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Manage the OmniTrack GitHub App, installed accounts, and synced repositories.
        </p>
      </header>

      {installs.length === 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text)]">No GitHub App installed</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Ask your GitHub org owner to install the OmniTrack GitHub App on the repositories you want to manage.
          </p>
          {installUrl && (
            <Link
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Install GitHub App
            </Link>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {installs.map(inst => {
            const installRepos = repos.filter(r => r.installation_id === inst.installation_id)
            return (
              <article
                key={inst.installation_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[var(--text)]">
                      {inst.account_login ?? "Unknown account"}
                      <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
                        ({inst.account_type ?? "?"})
                      </span>
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                      Installation #{inst.installation_id} · {installRepos.length} repos ·{" "}
                      {inst.repository_selection ?? "selection unknown"}
                      {inst.suspended_at && <span className="ml-2 text-amber-500">(suspended)</span>}
                    </p>
                  </div>
                  <SyncReposButton installationId={String(inst.installation_id)} label="Re-sync" />
                </header>

                {installRepos.length > 0 && (
                  <ul className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                    {installRepos.map(repo => (
                      <li key={repo.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                        <Link
                          href={repo.html_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[var(--text)] hover:underline"
                        >
                          {repo.full_name}
                        </Link>
                        <span className="text-[12px] text-[var(--text-muted)]">
                          {repo.private ? "private" : "public"}
                          {repo.default_branch && (
                            <span className="ml-2">default: {repo.default_branch}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </section>
      )}

      <footer className="mt-6 flex flex-wrap items-center gap-3">
        <SyncReposButton label="Sync all installations" />
        {installUrl && (
          <Link
            href={installUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Manage GitHub App on GitHub
          </Link>
        )}
        {lastSynced && (
          <span className="text-[12px] text-[var(--text-muted)]">
            Most recent repo update: {new Date(lastSynced).toLocaleString()}
          </span>
        )}
      </footer>
    </main>
  )
}
