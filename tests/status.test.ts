import { describe, expect, it } from "vitest"
import { assertTransition, canTransition, STATUSES, TRANSITIONS } from "@/lib/status"

describe("status state machine", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      it(`${from} to ${to}`, () => {
        expect(canTransition(from, to)).toBe(TRANSITIONS[from].includes(to))
      })
    }
  }

  it("throws for invalid transitions", () => {
    expect(() => assertTransition("todo", "done")).toThrow(
      "Invalid status transition: todo to done"
    )
  })
})
