import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { STATUS_LABELS } from "@/lib/status"
import type {
  DashboardData,
  DashboardNarrative,
  DashboardRange,
  MetricCard,
  OwnerWorkload,
  StatusCount,
  PriorityCount,
  TicketSummary,
} from "./dashboard-types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

const STATUS_COLORS: Record<string, string> = {
  backlog:     "#849495",
  todo:        "#849495",
  in_progress: "#e8c423",
  in_review:   "#d3bbff",
  done:        "#63D68A",
  blocked:     "#F06F82",
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#F06F82",
  high:     "#e8c423",
  medium:   "#d3bbff",
  low:      "#849495",
}

const PRIORITY_ORDER = ["critical", "high", "medium", "low"]

function rangeStart(range: DashboardRange): Date {
  const now = new Date()
  if (range === "this_week") {
    const day = now.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const start = new Date(now)
    start.setDate(now.getDate() + diff)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (range === "7d") {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  const d = new Date(now)
  d.setDate(d.getDate() - 30)
  return d
}

function dueSoonCutoff(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}

type RawTicket = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  updated_at: string
  blocker_reason: string | null
  project: string | null
  area: string | null
  assignee_id: string | null
  assignee?: { id: string; name: string; initials: string } | null
}

const SELECT = `
  id, title, status, priority, due_date, updated_at, blocker_reason, project, area, assignee_id,
  assignee:users!tickets_assignee_id_fkey(id, name, initials)
` as const

function toSummary(t: RawTicket): TicketSummary {
  return {
    id: t.id,
    title: t.title,
    status: t.status as TicketSummary["status"],
    priority: t.priority as TicketSummary["priority"],
    dueDate: t.due_date,
    updatedAt: t.updated_at,
    assigneeName: t.assignee?.name ?? null,
    blockerReason: t.blocker_reason,
  }
}

function buildNarrative(
  scope: "my" | "team",
  metrics: MetricCard[],
  blockers: TicketSummary[]
): DashboardNarrative {
  const get = (key: string) => metrics.find((m) => m.key === key)?.value ?? 0

  if (scope === "my") {
    const blocked = get("blocked")
    const inProgress = get("in_progress")
    const dueSoon = get("due_soon")

    if (blocked > 0) {
      return {
        headline: "Some of your work needs attention.",
        summary: `You have ${blocked} blocked ticket${blocked > 1 ? "s" : ""} and ${inProgress} in progress. Review your blockers before pulling new work.`,
        attentionItems: [
          `You have ${blocked} blocked ticket${blocked > 1 ? "s" : ""} — check for dependencies or escalations.`,
          ...(dueSoon > 0 ? [`${dueSoon} item${dueSoon > 1 ? "s" : ""} due within 7 days.`] : []),
        ],
        riskLevel: blocked > 2 ? "high" : ("medium" as const),
      }
    }
    if (dueSoon > 0) {
      return {
        headline: "Deadlines are approaching.",
        summary: `You have ${inProgress} tickets in progress and ${dueSoon} due within the next 7 days.`,
        attentionItems: [`${dueSoon} ticket${dueSoon > 1 ? "s" : ""} due soon — prioritize these first.`],
        riskLevel: "medium" as const,
      }
    }
    return {
      headline: "Your queue looks healthy.",
      summary: `You have ${inProgress} tickets in progress with no imminent deadlines or blockers.`,
      attentionItems: [],
      riskLevel: "low" as const,
    }
  }

  // team scope
  const active = get("active")
  const blocked = get("blocked")
  const oldest = blockers.sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  )[0]

  const daysSince = oldest
    ? Math.round(
        (Date.now() - new Date(oldest.updatedAt).getTime()) / 86_400_000
      )
    : 0

  if (blocked > 0) {
    return {
      headline: "Engineering is active, but blockers need attention.",
      summary: `The team has ${active} active tickets. ${blocked} blocked${oldest ? `, including "${oldest.title}" which has not moved in ${daysSince} day${daysSince !== 1 ? "s" : ""}.` : "."}`,
      attentionItems: [
        `Review ${blocked} blocked ticket${blocked > 1 ? "s" : ""}.`,
        ...(oldest && daysSince > 3
          ? [`"${oldest.title}" has been blocked for ${daysSince} days.`]
          : []),
      ],
      riskLevel: blocked > 3 ? ("high" as const) : ("medium" as const),
    }
  }

  return {
    headline: "Team momentum looks strong.",
    summary: `The team has ${active} active tickets with no current blockers.`,
    attentionItems: [],
    riskLevel: "low" as const,
  }
}

export async function getMyDashboardData(
  db: Db,
  currentUserId: string,
  range: DashboardRange = "this_week"
): Promise<DashboardData> {
  const { data: all, error } = await db
    .from("tickets")
    .select(SELECT)
    .eq("assignee_id", currentUserId)
    .order("updated_at", { ascending: false })

  if (error) throw error
  const tickets = (all ?? []) as unknown as RawTicket[]

  const now = new Date()
  const weekStart = rangeStart(range)
  const dueCutoff = dueSoonCutoff()

  const active     = tickets.filter((t) => t.status !== "done")
  const inProgress = active.filter((t) => t.status === "in_progress")
  const blocked    = active.filter((t) => t.status === "blocked")
  const completed  = tickets.filter(
    (t) => t.status === "done" && new Date(t.updated_at) >= weekStart
  )
  const dueSoon = active.filter(
    (t) => t.due_date && new Date(t.due_date) <= dueCutoff
  )
  const overdue = dueSoon.filter(
    (t) => t.due_date && new Date(t.due_date) < now
  )

  const metrics: MetricCard[] = [
    {
      key: "assigned",
      label: "Assigned to you",
      value: tickets.length,
      context: `${active.length} active`,
      tone: "neutral",
    },
    {
      key: "in_progress",
      label: "In progress",
      value: inProgress.length,
      tone: "neutral",
    },
    {
      key: "blocked",
      label: "Blocked",
      value: blocked.length,
      context: blocked.length > 0 ? "needs attention" : undefined,
      tone: blocked.length > 0 ? "critical" : "neutral",
    },
    {
      key: "due_soon",
      label: "Due soon",
      value: dueSoon.length,
      context: overdue.length > 0 ? `${overdue.length} overdue` : undefined,
      tone: overdue.length > 0 ? "warn" : dueSoon.length > 0 ? "warn" : "neutral",
    },
    {
      key: "completed_week",
      label: "Done this week",
      value: completed.length,
      tone: completed.length > 0 ? "good" : "neutral",
    },
  ]

  const statusMap: Record<string, number> = {}
  for (const t of tickets) {
    statusMap[t.status] = (statusMap[t.status] ?? 0) + 1
  }
  const statusDistribution: StatusCount[] = Object.entries(statusMap).map(
    ([status, count]) => ({
      status: status as StatusCount["status"],
      label: STATUS_LABELS[status as StatusCount["status"]] ?? status,
      count,
      color: STATUS_COLORS[status] ?? "#707B89",
    })
  )

  const priorityMap: Record<string, number> = {}
  for (const t of active) {
    priorityMap[t.priority] = (priorityMap[t.priority] ?? 0) + 1
  }
  const priorityDistribution: PriorityCount[] = PRIORITY_ORDER.filter(
    (p) => priorityMap[p] !== undefined
  ).map((p) => ({
    priority: p as PriorityCount["priority"],
    label: p.charAt(0).toUpperCase() + p.slice(1),
    count: priorityMap[p],
    color: PRIORITY_COLORS[p],
  }))

  const focusItems = [...active].sort((a, b) => {
    const aScore =
      (a.status === "blocked" ? 1000 : 0) +
      (a.priority === "critical" ? 100 : a.priority === "high" ? 50 : a.priority === "medium" ? 10 : 0) +
      (a.due_date && new Date(a.due_date) <= dueCutoff ? 20 : 0)
    const bScore =
      (b.status === "blocked" ? 1000 : 0) +
      (b.priority === "critical" ? 100 : b.priority === "high" ? 50 : b.priority === "medium" ? 10 : 0) +
      (b.due_date && new Date(b.due_date) <= dueCutoff ? 20 : 0)
    return bScore - aScore
  }).slice(0, 7).map(toSummary)

  const narrative = buildNarrative("my", metrics, blocked.map(toSummary))

  return {
    scope: "my",
    range,
    generatedAt: new Date().toISOString(),
    metrics,
    statusDistribution,
    priorityDistribution,
    focusItems,
    blockers: blocked.map(toSummary),
    dueSoon: dueSoon.map(toSummary),
    recentlyCompleted: completed.slice(0, 8).map(toSummary),
    recentMovement: tickets.slice(0, 10).map(toSummary),
    narrative,
  }
}

export async function getTeamDashboardData(
  db: Db,
  range: DashboardRange = "this_week"
): Promise<DashboardData> {
  const { data: all, error } = await db
    .from("tickets")
    .select(SELECT)
    .order("updated_at", { ascending: false })

  if (error) throw error
  const tickets = (all ?? []) as unknown as RawTicket[]

  const weekStart = rangeStart(range)

  const active      = tickets.filter((t) => t.status !== "done")
  const inProgress  = active.filter((t) => t.status === "in_progress")
  const blocked     = active.filter((t) => t.status === "blocked")
  const highPri     = active.filter((t) => t.priority === "critical" || t.priority === "high")
  const completedWk = tickets.filter(
    (t) => t.status === "done" && new Date(t.updated_at) >= weekStart
  )

  const metrics: MetricCard[] = [
    {
      key: "active",
      label: "Active tickets",
      value: active.length,
      tone: "neutral",
    },
    {
      key: "in_progress",
      label: "In progress",
      value: inProgress.length,
      tone: "neutral",
    },
    {
      key: "blocked",
      label: "Blocked",
      value: blocked.length,
      context: blocked.length > 0 ? "needs review" : undefined,
      tone: blocked.length > 0 ? "critical" : "neutral",
    },
    {
      key: "high_priority",
      label: "Critical / High",
      value: highPri.length,
      context: `${active.length > 0 ? Math.round((highPri.length / active.length) * 100) : 0}% of queue`,
      tone: highPri.length / Math.max(active.length, 1) > 0.4 ? "warn" : "neutral",
    },
    {
      key: "done_week",
      label: "Done this week",
      value: completedWk.length,
      tone: completedWk.length > 0 ? "good" : "neutral",
    },
  ]

  const statusMap: Record<string, number> = {}
  for (const t of tickets) {
    statusMap[t.status] = (statusMap[t.status] ?? 0) + 1
  }
  const statusDistribution: StatusCount[] = Object.entries(statusMap).map(
    ([status, count]) => ({
      status: status as StatusCount["status"],
      label: STATUS_LABELS[status as StatusCount["status"]] ?? status,
      count,
      color: STATUS_COLORS[status] ?? "#707B89",
    })
  )

  const priorityMap: Record<string, number> = {}
  for (const t of active) {
    priorityMap[t.priority] = (priorityMap[t.priority] ?? 0) + 1
  }
  const priorityDistribution: PriorityCount[] = PRIORITY_ORDER.filter(
    (p) => priorityMap[p] !== undefined
  ).map((p) => ({
    priority: p as PriorityCount["priority"],
    label: p.charAt(0).toUpperCase() + p.slice(1),
    count: priorityMap[p],
    color: PRIORITY_COLORS[p],
  }))

  // owner workload
  const ownerMap: Record<string, OwnerWorkload> = {}
  for (const t of active) {
    if (!t.assignee_id) continue
    if (!ownerMap[t.assignee_id]) {
      ownerMap[t.assignee_id] = {
        ownerId: t.assignee_id,
        ownerName: t.assignee?.name ?? t.assignee_id,
        initials: t.assignee?.initials ?? "?",
        active: 0,
        blocked: 0,
      }
    }
    ownerMap[t.assignee_id].active++
    if (t.status === "blocked") ownerMap[t.assignee_id].blocked++
  }
  const ownerWorkload = Object.values(ownerMap)
    .sort((a, b) => b.active - a.active)
    .slice(0, 8)

  // initiative distribution via project/area as proxy
  const initMap: Record<string, number> = {}
  for (const t of active) {
    const key = t.project ?? t.area ?? "Other"
    initMap[key] = (initMap[key] ?? 0) + 1
  }
  const initiativeDistribution = Object.entries(initMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const narrative = buildNarrative("team", metrics, blocked.map(toSummary))

  return {
    scope: "team",
    range,
    generatedAt: new Date().toISOString(),
    metrics,
    statusDistribution,
    priorityDistribution,
    ownerWorkload,
    blockers: blocked.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()).map(toSummary),
    recentlyCompleted: completedWk.slice(0, 8).map(toSummary),
    recentMovement: tickets.slice(0, 10).map(toSummary),
    initiativeDistribution,
    narrative,
  }
}
