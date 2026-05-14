import { redirect } from "next/navigation"
import { Github } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { GithubRepoPicker } from "@/components/github-repo-picker"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://omnitrack-ten.vercel.app"
const CALLBACK_URL = `${APP_URL}/api/auth/github/callback`

export const metadata = { title: "GitHub Integration — SECC" }

export default async function GithubSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: connection } = await supabase
    .from("github_user_connections")
    .select("github_login, connected_at")
    .eq("user_id", user.id)
    .single()

  const { data: savedRepos } = await supabase
    .from("github_repos")
    .select("full_name, label")
    .order("added_at")

  const params = searchParams ? await searchParams : undefined
  const justConnected = params?.connected === "1"
  const oauthError = params?.error

  const oauthConfigured = !!(
    process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET
  )

  return (
    <main className="mx-auto max-w-[680px] px-6 py-12">
      <h1 className="mb-1 text-[18px] font-semibold text-[var(--text)]">GitHub Integration</h1>
      <p className="mb-10 text-[13px] text-[var(--text-muted)]">
        Connect SECC to GitHub so the team can create branches and raise PRs directly from tickets.
      </p>

      {/* ── Step 1: Create the OAuth App ─────────────────────── */}
      <section className="mb-8">
        <StepHeader n={1} title="Create a GitHub OAuth App" done={oauthConfigured} />
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[13px] text-[var(--text-muted)]">
          {oauthConfigured ? (
            <p className="text-[var(--text)]">
              OAuth App credentials are configured. Nothing to do here.
            </p>
          ) : (
            <>
              <p className="mb-4">
                Go to{" "}
                <span className="font-mono text-[var(--text)]">
                  GitHub → org Settings → Developer settings → OAuth Apps → New OAuth App
                </span>{" "}
                and fill in:
              </p>
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  {[
                    ["Application name", "SECC"],
                    ["Homepage URL", APP_URL],
                    ["Authorization callback URL", CALLBACK_URL]
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{label}</td>
                      <td className="py-2 font-mono text-[var(--text)]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4">
                After registering, copy the <strong className="text-[var(--text)]">Client ID</strong> and{" "}
                <strong className="text-[var(--text)]">Client Secret</strong> into your environment
                variables:
              </p>
              <pre className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 font-mono text-[11px] text-[var(--text)]">
                {`GITHUB_OAUTH_CLIENT_ID=<your-client-id>\nGITHUB_OAUTH_CLIENT_SECRET=<your-client-secret>\nGITHUB_WEBHOOK_SECRET=<random-secret>`}
              </pre>
              <p className="mt-3 text-[12px] text-[var(--text-faint)]">
                Redeploy SECC after adding the env vars — then come back to this page.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Step 2: Connect GitHub account ───────────────────── */}
      <section className="mb-8">
        <StepHeader
          n={2}
          title="Connect your GitHub account"
          done={!!connection}
          disabled={!oauthConfigured}
        />
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {connection ? (
            <div className="flex items-center gap-3">
              <Github size={18} className="shrink-0 text-[var(--text-muted)]" />
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  Connected as{" "}
                  <span className="font-mono text-[var(--accent)]">@{connection.github_login}</span>
                </p>
                <p className="text-[12px] text-[var(--text-faint)]">
                  {justConnected ? "Just connected." : `Connected ${formatDate(connection.connected_at)}`}
                </p>
              </div>
              <a
                href="/api/auth/github"
                className="ml-auto text-[12px] text-[var(--text-faint)] underline underline-offset-2 hover:text-[var(--text-muted)]"
              >
                Reconnect
              </a>
            </div>
          ) : (
            <div>
              {oauthError && (
                <p className="mb-3 text-[12px] text-red-400">
                  {oauthError === "oauth" && "GitHub returned an error. Try again."}
                  {oauthError === "state" && "Session mismatch. Please try again."}
                  {oauthError === "token" && "Could not exchange the code for a token. Check your OAuth App credentials."}
                </p>
              )}
              <a
                href={oauthConfigured ? "/api/auth/github" : undefined}
                aria-disabled={!oauthConfigured}
                className={[
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors",
                  oauthConfigured
                    ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
                    : "cursor-not-allowed border-[var(--border)] text-[var(--text-faint)] opacity-50"
                ].join(" ")}
              >
                <Github size={15} />
                Connect with GitHub
              </a>
              <p className="mt-2 text-[12px] text-[var(--text-faint)]">
                This grants SECC repo access under your account. Only you can see your token.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Step 3: Pick repos ───────────────────────────────── */}
      <section className="mb-8">
        <StepHeader
          n={3}
          title="Choose which repositories to allow"
          done={(savedRepos?.length ?? 0) > 0}
          disabled={!connection}
        />
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {connection ? (
            <GithubRepoPicker savedRepos={savedRepos ?? []} />
          ) : (
            <p className="text-[13px] text-[var(--text-faint)]">
              Connect your GitHub account first.
            </p>
          )}
        </div>
      </section>

      {/* ── Step 4: Webhook ──────────────────────────────────── */}
      <section>
        <StepHeader n={4} title="Set up the webhook (optional)" />
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[13px] text-[var(--text-muted)]">
          <p className="mb-3">
            To automatically move tickets to <strong className="text-[var(--text)]">In Review</strong> when a
            PR opens and <strong className="text-[var(--text)]">Done</strong> when it merges, add an
            org-level webhook on GitHub:
          </p>
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {[
                ["Payload URL", `${APP_URL}/api/github/webhook`],
                ["Content type", "application/json"],
                ["Secret", "$GITHUB_WEBHOOK_SECRET (the value from your env vars)"],
                ["Events", "Pull requests"]
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--text-muted)]">{label}</td>
                  <td className="py-2 font-mono text-[var(--text)]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function StepHeader({
  n,
  title,
  done = false,
  disabled = false
}: {
  n: number
  title: string
  done?: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          done
            ? "bg-[var(--accent)] text-white"
            : disabled
            ? "bg-[var(--surface-2)] text-[var(--text-faint)]"
            : "bg-[var(--surface-2)] text-[var(--text-muted)]"
        ].join(" ")}
      >
        {done ? "✓" : n}
      </span>
      <span
        className={[
          "text-[14px] font-medium",
          disabled ? "text-[var(--text-faint)]" : "text-[var(--text)]"
        ].join(" ")}
      >
        {title}
      </span>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}
