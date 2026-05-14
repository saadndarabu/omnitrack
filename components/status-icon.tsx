import {
  Ban,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  type LucideIcon
} from "lucide-react"
import type { Status } from "@/lib/status"

const map: Record<Status, { Icon: LucideIcon; cls: string }> = {
  backlog: { Icon: CircleDashed, cls: "text-[var(--text-faint)]" },
  todo: { Icon: Circle, cls: "text-[var(--status-todo)]" },
  in_progress: { Icon: CircleDot, cls: "text-[var(--status-progress)]" },
  in_review: { Icon: CircleDot, cls: "text-[var(--status-review)]" },
  done: { Icon: CircleCheck, cls: "text-[var(--status-done)]" },
  blocked: { Icon: Ban, cls: "text-[var(--status-blocked)]" }
}

export function StatusIcon({
  status,
  size = 16
}: {
  status: Status
  size?: number
}) {
  const { Icon, cls } = map[status]
  return <Icon size={size} className={cls} aria-label={status} />
}
