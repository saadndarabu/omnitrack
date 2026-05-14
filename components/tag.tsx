import { cn } from "@/lib/utils"

export function Tag({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] items-center rounded border-[0.5px] border-[var(--border)] bg-[var(--surface-2)] px-1.5 font-mono text-[10.5px] font-medium tracking-wide text-[var(--text-faint)]",
        className
      )}
    >
      {value.toLowerCase()}
    </span>
  )
}
