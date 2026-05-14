import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "quiet" | "ghost"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#111827] text-white shadow-[0_8px_18px_rgba(17,24,39,0.12)] hover:bg-[#1f2937] active:bg-[#111827] active:shadow-none",
  quiet:
    "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)] active:bg-[var(--surface-2)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
}

export function Button({
  variant = "quiet",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-[40px] items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-[650] transition-[box-shadow,background-color,color] duration-[120ms] ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}

export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-[background-color,color] duration-[120ms] ease-out hover:bg-[var(--surface-2)] hover:text-[var(--text)] active:bg-[var(--surface-3)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
