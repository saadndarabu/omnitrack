"use client"

import {
  type ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import { cn } from "@/lib/utils"

type PopoverProps = {
  trigger: ReactNode
  children: (close: () => void) => ReactNode
  align?: "start" | "end"
  className?: string
  panelClassName?: string
}

export function Popover({
  trigger,
  children,
  align = "start",
  className,
  panelClassName
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointer(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", onPointer)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onPointer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !panelRef.current) {
      return
    }
    panelRef.current.focus({ preventScroll: true })
  }, [open])

  const triggerNode =
    isValidElement(trigger) ?
      cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
        onClick: (event: React.MouseEvent) => {
          const existing = (trigger.props as { onClick?: (event: React.MouseEvent) => void })
            .onClick
          existing?.(event)
          if (!event.defaultPrevented) {
            setOpen((value) => !value)
          }
        },
        "aria-haspopup": "true",
        "aria-expanded": open,
        "aria-controls": labelId
      }) : (
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {trigger}
        </button>
      )

  return (
    <div ref={wrapperRef} className={cn("relative inline-flex", className)}>
      {triggerNode}
      {open ? (
        <div
          ref={panelRef}
          id={labelId}
          role="dialog"
          tabIndex={-1}
          className={cn(
            "absolute top-full z-30 mt-1.5 min-w-[208px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_6px_-2px_rgba(16,24,40,0.04),0_12px_36px_-4px_rgba(16,24,40,0.10)] focus:outline-none",
            align === "end" ? "right-0" : "left-0",
            panelClassName
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  )
}
