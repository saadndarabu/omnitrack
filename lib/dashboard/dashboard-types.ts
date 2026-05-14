import type { Status } from "@/lib/status"
import type { Priority } from "@/types/ticket"

export type DashboardScope = "my" | "team"
export type DashboardRange = "this_week" | "7d" | "30d"

export type MetricCard = {
  key: string
  label: string
  value: number
  context?: string
  tone: "neutral" | "good" | "warn" | "critical"
}

export type StatusCount = {
  status: Status
  label: string
  count: number
  color: string
}

export type PriorityCount = {
  priority: Priority
  label: string
  count: number
  color: string
}

export type OwnerWorkload = {
  ownerId: string
  ownerName: string
  initials: string
  active: number
  blocked: number
}

export type TicketSummary = {
  id: string
  title: string
  status: Status
  priority: Priority
  dueDate: string | null
  updatedAt: string
  assigneeName: string | null
  blockerReason: string | null
}

export type InitiativeCount = {
  name: string
  count: number
}

export type DashboardNarrative = {
  headline: string
  summary: string
  attentionItems: string[]
  riskLevel: "low" | "medium" | "high"
}

export type DashboardData = {
  scope: DashboardScope
  range: DashboardRange
  generatedAt: string
  metrics: MetricCard[]
  statusDistribution: StatusCount[]
  priorityDistribution: PriorityCount[]
  ownerWorkload?: OwnerWorkload[]
  blockers: TicketSummary[]
  focusItems?: TicketSummary[]
  dueSoon?: TicketSummary[]
  recentlyCompleted: TicketSummary[]
  recentMovement: TicketSummary[]
  initiativeDistribution?: InitiativeCount[]
  narrative: DashboardNarrative
}
