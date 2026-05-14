import { CircleDot } from "lucide-react"
import { signInWithGoogle } from "@/app/login/actions"
import { Button } from "@/components/ui/button"

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const hasError = Boolean(resolvedSearchParams?.error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[360px] rounded-xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-6 flex items-center gap-2">
          <CircleDot size={20} className="text-[var(--accent)]" />
          <h1 className="text-[14px] font-medium text-[var(--text)]">SECC</h1>
        </div>
        <form action={signInWithGoogle}>
          <Button type="submit" variant="quiet" className="w-full">
            Continue with Google
          </Button>
        </form>
        {hasError ? (
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            Google sign-in is not configured for this environment.
          </p>
        ) : null}
      </div>
    </main>
  )
}
