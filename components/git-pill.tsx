import { GitBranch, GitPullRequest } from "lucide-react"
import { cn } from "@/lib/utils"

type GitPillProps =
  | {
      type: "branch"
      value: string
    }
  | {
      type: "pr"
      value: number
    }

export function GitPill({ type, value }: GitPillProps) {
  const isPr = type === "pr"
  return (
    <span className="inline-flex max-w-[184px] shrink-0 items-center gap-1.5 rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--text-muted)]">
      {isPr ? (
        <GitPullRequest size={16} className="shrink-0 text-[var(--status-review)]" />
      ) : (
        <GitBranch size={16} className="shrink-0 text-[var(--text-faint)]" />
      )}
      <span className={cn("truncate", isPr && "text-[var(--text)]")}>
        {isPr ? `PR #${value}` : value}
      </span>
    </span>
  )
}
