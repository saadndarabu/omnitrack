import { signInWithGoogle } from "@/app/login/actions"
import { Button } from "@/components/ui/button"

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const errorCode = resolvedSearchParams?.error

  const errorMessage =
    errorCode === "domain"
      ? "Access is restricted to @sirp.io accounts."
      : errorCode
      ? "Sign-in failed. Please try again."
      : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--text)] text-[13px] font-semibold tracking-tight text-[var(--bg)]">
            S
          </span>
          <span>
            <span className="block text-[14px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text)]">
              SECC
            </span>
            <span className="block text-[11.5px] leading-tight text-[var(--text-faint)]">
              Engineering command
            </span>
          </span>
        </div>

        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">
            Sign in
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Use your <span className="font-medium text-[var(--text)]">@sirp.io</span> Google account to continue.
          </p>

          <form action={signInWithGoogle} className="mt-5">
            <Button type="submit" variant="primary" className="w-full">
              Continue with Google
            </Button>
          </form>

          {errorMessage ? (
            <p className="mt-3 rounded-[6px] border border-[color-mix(in_srgb,var(--status-blocked)_24%,var(--border))] bg-[color-mix(in_srgb,var(--status-blocked)_5%,var(--surface))] px-2.5 py-2 text-[12.5px] text-[var(--status-blocked)]">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-[11.5px] text-[var(--text-faint)]">
          By signing in, you agree to your team&rsquo;s acceptable-use policy.
        </p>
      </div>
    </main>
  )
}
