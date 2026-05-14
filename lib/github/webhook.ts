import { parseTicketIdFromText } from "@/lib/ids"

type PullRequestPayload = {
  action?: string
  pull_request?: {
    number?: number
    title?: string | null
    body?: string | null
    merged?: boolean
    head?: {
      ref?: string | null
    }
  }
}

export type TicketWebhookUpdate = {
  ticketId: string
  status: "in_review" | "done"
  prNumber: number
  source: "pr_opened" | "pr_merged"
}

function ticketIdFromPullRequest(payload: PullRequestPayload) {
  const pullRequest = payload.pull_request

  if (!pullRequest) {
    return null
  }

  return (
    parseTicketIdFromText(pullRequest.head?.ref ?? "") ??
    parseTicketIdFromText(pullRequest.title ?? "") ??
    parseTicketIdFromText(pullRequest.body ?? "")
  )
}

export function deriveTicketUpdateFromWebhook(payload: unknown): TicketWebhookUpdate | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const normalizedPayload = payload as PullRequestPayload
  const pullRequest = normalizedPayload.pull_request
  const ticketId = ticketIdFromPullRequest(normalizedPayload)
  const prNumber = pullRequest?.number

  if (!pullRequest || !ticketId || !prNumber) {
    return null
  }

  if (normalizedPayload.action === "closed" && pullRequest.merged) {
    return {
      ticketId,
      prNumber,
      status: "done",
      source: "pr_merged"
    }
  }

  if (
    normalizedPayload.action === "opened" ||
    normalizedPayload.action === "ready_for_review" ||
    normalizedPayload.action === "reopened"
  ) {
    return {
      ticketId,
      prNumber,
      status: "in_review",
      source: "pr_opened"
    }
  }

  return null
}
