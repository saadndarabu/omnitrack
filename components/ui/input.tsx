import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-8 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] transition-colors focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border-strong))] focus:bg-[var(--surface)] focus-visible:outline-none disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-none rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[13px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-faint)] transition-colors focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border-strong))] focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
