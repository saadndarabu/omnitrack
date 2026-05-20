import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost" | "danger"
type ButtonSize = "sm" | "md"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--text)] text-[var(--bg)] border border-[var(--text)] hover:bg-[#000] hover:border-[#000] active:bg-[var(--text)]",
  secondary:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]",
  quiet:
    "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:border-[var(--border-strong)] active:bg-[var(--surface-3)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] border border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
  danger:
    "bg-transparent text-[var(--status-blocked)] border border-[color-mix(in_srgb,var(--status-blocked)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--status-blocked)_8%,transparent)]"
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-[6px]",
  md: "h-8 px-3 text-[13px] gap-2 rounded-[6px]"
}

export function Button({
  variant = "quiet",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:focus-input disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
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
  size?: "sm" | "md"
}

export function IconButton({
  label,
  children,
  className,
  size = "md",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] active:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:focus-input disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
