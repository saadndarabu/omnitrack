"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"
import type { Notification } from "@/lib/db/notifications"

const TYPE_LABELS: Record<Notification["type"], string> = {
  assigned:      "Assigned to you",
  mentioned:     "Mentioned in comment",
  due_soon:      "Due soon",
  comment_added: "New comment"
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // silent
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  async function markRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
  }

  async function markAllRead(close: () => void) {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch(`/api/notifications?userId=${userId}`, { method: "PATCH" })
    close()
  }

  const trigger = (
    <button
      type="button"
      aria-label="Notifications"
      className={cn(
        "relative inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-none",
        unreadCount > 0 ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
      )}
    >
      <Bell size={15} />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[var(--text)] px-[3px] text-[9px] font-semibold leading-none text-[var(--bg)] ring-2 ring-[var(--bg)]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )

  return (
    <Popover trigger={trigger} align="end" panelClassName="w-[340px]">
      {(close) => (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold text-[var(--text)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead(close)}
                className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--text-faint)]">
              No notifications
            </div>
          ) : (
            <ul className="max-h-[400px] overflow-y-auto">
              {notifications.map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-2)]",
                      !n.read && "bg-[var(--surface-2)]"
                    )}
                  >
                    <div className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-[var(--text)]"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium text-[var(--text-muted)]">
                          {TYPE_LABELS[n.type]}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--text-faint)]">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-[var(--text)]">
                        {n.message}
                      </p>
                      <span className="mt-1 inline-block text-[11px] text-[var(--text-faint)]">
                        {n.ticketId}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}
