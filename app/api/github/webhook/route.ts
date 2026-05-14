import { NextResponse } from "next/server"
import { deriveTicketUpdateFromWebhook } from "@/lib/github/webhook"

export async function POST(request: Request) {
  const eventName = request.headers.get("x-github-event")

  if (eventName !== "pull_request") {
    return NextResponse.json({ ignored: true })
  }

  const payload = (await request.json()) as unknown
  const update = deriveTicketUpdateFromWebhook(payload)

  return NextResponse.json({
    ignored: !update,
    update
  })
}
