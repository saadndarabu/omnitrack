import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "quiet" | "ghost"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] shadow-[inset_0_0_12px_color-mix(in_srgb,var(--accent)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] active:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
  quiet:
    "bg-[var(--surface-2)] text-[var(--text)] hover:brightness-110 active:brightness-95",
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
        "inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-medium transition-[filter,background-color,color] duration-[120ms] ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
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
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-[background-color,color,filter] duration-[120ms] ease-out hover:bg-[var(--surface-2)] hover:text-[var(--text)] active:brightness-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
