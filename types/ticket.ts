import type { Status } from "@/lib/status"
import type { User } from "@/types/user"

export type Project = "sara" | "omniscan" | "platform"
export type WorkType = "feature" | "enhancement" | "bug" | "task" | "epic"
export type Priority = "critical" | "high" | "medium" | "low"
export type Area = "platform" | "product" | "integrations"
export type Component = "tickets" | "github" | "routing" | "filters" | "state"

export type TicketComment = {
  id: string
  author: User
  body: string
  createdAt: string
}

export type Ticket = {
  id: string
  title: string
  description: string
  workType: WorkType
  status: Status
  priority: Priority
  project: Project
  area: Area
  component: Component
  estimate: string | null
  dueDate: string | null
  acceptanceCriteria: string[]
  blockerReason: string | null
  labels: string[]
  branch: string | null
  prNumber: number | null
  assignee: User | null
  parentId: string | null
  subtasks: Ticket[]
  fbApproved: boolean
  createdAt: string
  updatedAt: string
  comments: TicketComment[]
}
