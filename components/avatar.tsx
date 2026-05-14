import type { CSSProperties } from "react"
import type { User } from "@/types/user"
import { cn } from "@/lib/utils"

const tintVars = [
  "--status-review",
  "--status-done",
  "--status-progress",
  "--status-blocked",
  "--accent"
] as const

function hash(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0)
}

export function Avatar({
  user,
  size = 22,
  className
}: {
  user: User | null
  size?: 22 | 28
  className?: string
}) {
  const seed = user?.id ?? "unassigned"
  const tint = tintVars[hash(seed) % tintVars.length]
  const style = {
    width: size,
    height: size,
    backgroundColor: `color-mix(in srgb, var(${tint}) 18%, var(--surface))`,
    color: `var(${tint})`
  } satisfies CSSProperties

  return (
    <span
      aria-label={user ? user.name : "Unassigned"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-[11px] font-medium leading-none",
        className
      )}
      style={style}
    >
      {user?.initials ?? "--"}
    </span>
  )
}
