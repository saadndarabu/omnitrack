export const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked"
] as const

export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To-do",
  in_progress: "In progress",
  in_review: "QA",
  done: "Done",
  blocked: "Blocked"
}

export const STATUS_SHORTCUTS: Record<"1" | "2" | "3" | "4" | "5", Status> = {
  "1": "todo",
  "2": "in_progress",
  "3": "in_review",
  "4": "done",
  "5": "blocked"
}

export const TRANSITIONS: Record<Status, Status[]> = {
  backlog: ["todo", "blocked"],
  todo: ["in_progress", "backlog", "blocked"],
  in_progress: ["in_review", "blocked", "todo"],
  in_review: ["done", "in_progress", "blocked"],
  done: ["in_progress"],
  blocked: ["todo", "in_progress"]
}

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to)
}

export function assertTransition(from: Status, to: Status) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition: ${from} to ${to}`)
  }
}
