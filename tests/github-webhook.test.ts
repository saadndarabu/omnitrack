import { describe, expect, it } from "vitest"
import mergedFixture from "@/tests/fixtures/github-pr-merged.json"
import openedFixture from "@/tests/fixtures/github-pr-opened.json"
import { deriveTicketUpdateFromWebhook } from "@/lib/github/webhook"

describe("github pull request webhook", () => {
  it("moves referenced tickets into review when a PR opens", () => {
    expect(deriveTicketUpdateFromWebhook(openedFixture)).toEqual({
      ticketId: "SIRP-142",
      prNumber: 284,
      status: "in_review",
      source: "pr_opened"
    })
  })

  it("moves referenced tickets to done when a PR merges", () => {
    expect(deriveTicketUpdateFromWebhook(mergedFixture)).toEqual({
      ticketId: "SIRP-146",
      prNumber: 279,
      status: "done",
      source: "pr_merged"
    })
  })

  it("ignores pull request events without ticket references", () => {
    expect(
      deriveTicketUpdateFromWebhook({
        action: "opened",
        pull_request: {
          number: 300,
          title: "Update dependency lockfile",
          body: null,
          head: {
            ref: "task/dependency-lockfile"
          }
        }
      })
    ).toBeNull()
  })
})
