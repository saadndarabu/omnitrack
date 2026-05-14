import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { deriveTicketUpdateFromWebhook } from "@/lib/github/webhook"

async function verifySignature(request: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return true // skip verification if no secret configured

  const signature = request.headers.get("x-hub-signature-256")
  if (!signature) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
  const expected = "sha256=" + Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return expected === signature
}

export async function POST(request: Request) {
  const eventName = request.headers.get("x-github-event")

  if (eventName !== "pull_request") {
    return NextResponse.json({ ignored: true })
  }

  const rawBody = await request.text()

  if (!(await verifySignature(request, rawBody))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const update = deriveTicketUpdateFromWebhook(payload)
  if (!update) {
    return NextResponse.json({ ignored: true })
  }

  const db = createSupabaseAdminClient()
  await db
    .from("tickets")
    .update({ status: update.status, pr_number: update.prNumber })
    .eq("id", update.ticketId)

  return NextResponse.json({ ok: true, update })
}
