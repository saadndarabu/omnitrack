"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { Check, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error"

type Toast = {
  id:      string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, variant }])
    const timer = setTimeout(() => dismiss(id), 4000)
    timers.current.set(id, timer)
  }, [dismiss])

  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout) }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex min-w-[260px] max-w-[360px] items-start gap-2.5 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-lg)] transition-all duration-200"
            )}
          >
            <span className={cn(
              "mt-[1px] shrink-0",
              t.variant === "success" ? "text-[var(--status-done)]" : "text-[var(--status-blocked)]"
            )}>
              {t.variant === "success" ? <Check size={14} strokeWidth={2.5} /> : <AlertTriangle size={14} strokeWidth={2.5} />}
            </span>
            <span className="flex-1 text-[13px] leading-snug text-[var(--text)]">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx.toast
}
