import type { Ticket } from "@/types/ticket"
import type { User } from "@/types/user"

const nullProfile = {
  areas: [] as User["areas"],
  avatarUrl: null,
  githubUsername: null,
  githubEmail: null,
  githubConnectedAt: null,
}

export const users: User[] = [
  { id: "user_saadia", name: "Saadia Noor",  email: "saadia@sirp.io", initials: "SN", role: "admin",  ...nullProfile },
  { id: "user_haris",  name: "Haris Malik",  email: "haris@sirp.io",  initials: "HM", role: "member", ...nullProfile },
  { id: "user_mina",   name: "Mina Qureshi", email: "mina@sirp.io",   initials: "MQ", role: "member", ...nullProfile },
  { id: "user_omar",   name: "Omar Shah",    email: "omar@sirp.io",   initials: "OS", role: "viewer", ...nullProfile },
]

export const currentUser = users[0]

export const tickets: Ticket[] = [
  {
    id: "SIRP-141",
    title: "Persist branch creation state after status change",
    description:
      "When a ticket moves into progress, the branch pill should appear as soon as the GitHub App confirms creation.",
    workType: "enhancement",
    status: "in_progress",
    priority: "high",
    project: "platform",
    area: "integrations",
    component: "state",
    estimate: "3 pts",
    dueDate: "2026-05-10",
    acceptanceCriteria: [
      "Branch state appears immediately after moving to in progress",
      "Webhook confirmation keeps the branch reference in sync"
    ],
    blockerReason: null,
    labels: ["github", "state"],
    branch: "task/SIRP-141-branch-state",
    prNumber: null,
    assignee: users[1],
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-06T08:35:00.000Z",
    updatedAt: "2026-05-07T07:45:00.000Z",
    comments: [
      {
        id: "comment_141_1",
        author: users[0],
        body: "Webhook latency is fine; the missing state is local UI feedback.",
        createdAt: "2026-05-06T10:20:00.000Z"
      }
    ]
  },
  {
    id: "SIRP-142",
    title: "Reconcile PR webhook references across title and branch",
    description:
      "PR opened events should find the ticket ID in the branch name first, then title, then body.",
    workType: "bug",
    status: "in_review",
    priority: "critical",
    project: "platform",
    area: "integrations",
    component: "github",
    estimate: "2 pts",
    dueDate: "2026-05-09",
    acceptanceCriteria: [
      "Branch name is checked before title and body",
      "PR number is attached to the referenced ticket"
    ],
    blockerReason: null,
    labels: ["webhook"],
    branch: "task/SIRP-142-webhook-refs",
    prNumber: 284,
    assignee: users[2],
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-05T11:05:00.000Z",
    updatedAt: "2026-05-07T06:18:00.000Z",
    comments: []
  },
  {
    id: "SIRP-143",
    title: "Add static empty state for active filters",
    description:
      "Filtered views should render a quiet static message when there are no matching rows.",
    workType: "feature",
    status: "todo",
    priority: "medium",
    project: "sara",
    area: "product",
    component: "filters",
    estimate: "1 pt",
    dueDate: "2026-05-13",
    acceptanceCriteria: [
      "Empty filtered views render without layout shift",
      "Message copy matches the current workspace tone"
    ],
    blockerReason: null,
    labels: ["filters"],
    branch: null,
    prNumber: null,
    assignee: users[0],
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-06T13:22:00.000Z",
    updatedAt: "2026-05-06T17:10:00.000Z",
    comments: []
  },
  {
    id: "SIRP-144",
    title: "Block invalid done action while a PR is still open",
    description:
      "The done transition from review is webhook-owned and should not appear as a manual control.",
    workType: "bug",
    status: "blocked",
    priority: "high",
    project: "platform",
    area: "platform",
    component: "tickets",
    estimate: "2 pts",
    dueDate: "2026-05-08",
    acceptanceCriteria: [
      "Manual done action is hidden while review is webhook-owned",
      "Blocked tickets retain the latest blocker reason"
    ],
    blockerReason: "Waiting on the webhook fixture from the merged PR case.",
    labels: ["status"],
    branch: "task/SIRP-144-done-action",
    prNumber: 281,
    assignee: users[3],
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-04T09:44:00.000Z",
    updatedAt: "2026-05-06T14:32:00.000Z",
    comments: [
      {
        id: "comment_144_1",
        author: users[3],
        body: "Waiting on the webhook fixture from the merged PR case.",
        createdAt: "2026-05-06T14:32:00.000Z"
      }
    ]
  },
  {
    id: "SIRP-145",
    title: "Normalize ticket ID parsing before branch generation",
    description:
      "Ticket IDs pasted in lowercase should normalize before branch names are generated.",
    workType: "task",
    status: "backlog",
    priority: "low",
    project: "omniscan",
    area: "platform",
    component: "tickets",
    estimate: null,
    dueDate: null,
    acceptanceCriteria: [
      "Lowercase IDs normalize before branch generation",
      "Generated branch names keep the canonical ticket ID"
    ],
    blockerReason: null,
    labels: ["ids"],
    branch: null,
    prNumber: null,
    assignee: null,
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-03T07:50:00.000Z",
    updatedAt: "2026-05-05T12:15:00.000Z",
    comments: []
  },
  {
    id: "SIRP-146",
    title: "Tighten modal escape behavior from pasted links",
    description:
      "Esc should always return to the ticket list, including when the detail URL was opened directly.",
    workType: "enhancement",
    status: "done",
    priority: "medium",
    project: "sara",
    area: "product",
    component: "routing",
    estimate: "1 pt",
    dueDate: "2026-05-06",
    acceptanceCriteria: [
      "Escape returns direct ticket URLs to the ticket list",
      "Local modal state is cleared on close"
    ],
    blockerReason: null,
    labels: ["routing"],
    branch: "task/SIRP-146-modal-escape",
    prNumber: 279,
    assignee: users[0],
    parentId: null,
    subtasks: [],
    fbApproved: false,
    createdAt:"2026-05-01T16:10:00.000Z",
    updatedAt: "2026-05-05T09:20:00.000Z",
    comments: []
  }
]

export async function getTickets(): Promise<Ticket[]> {
  return tickets
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  return tickets.find((ticket) => ticket.id.toLowerCase() === ticketId.toLowerCase()) ?? null
}
