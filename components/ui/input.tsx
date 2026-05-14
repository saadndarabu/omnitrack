import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-8 w-full rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none",
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
        "min-h-24 w-full resize-none rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:focus-input focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}
