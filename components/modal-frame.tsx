"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { IconButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ModalFrame({
  ariaLabel,
  title,
  headerActions,
  children,
  onClose,
  className
}: {
  ariaLabel?: string
  title: ReactNode
  headerActions?: ReactNode
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : "Dialog")}
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(15,15,15,0.32)] px-3 py-3 sm:px-4 sm:py-8"
    >
      <div
        className={cn(
          "flex max-h-[calc(100vh-1.5rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[calc(100vh-4rem)]",
          className
        )}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3.5">
          <div className="min-w-0 flex-1">{title}</div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <IconButton label="Close" onClick={onClose} size="sm">
              <X size={15} />
            </IconButton>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
