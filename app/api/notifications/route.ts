import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbCreateNotification, dbGetNotifications, dbMarkAllRead } from "@/lib/db/notifications"

// GET /api/notifications?userId=
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const db = await createSupabaseServerClient()
  const notifications = await dbGetNotifications(db, userId)
  return NextResponse.json(notifications)
}

// POST /api/notifications — create a notification
export async function POST(request: Request) {
  const body = await request.json()
  const { userId, type, ticketId, actorId, message } = body
  if (!userId || !type || !ticketId || !message) {
    return NextResponse.json({ error: "userId, type, ticketId, message are required" }, { status: 400 })
  }

  const db = await createSupabaseServerClient()
  await dbCreateNotification(db, { userId, type, ticketId, actorId: actorId ?? null, message })
  return NextResponse.json({ ok: true })
}

// PATCH /api/notifications?userId=  — mark all read
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const db = await createSupabaseServerClient()
  await dbMarkAllRead(db, userId)
  return NextResponse.json({ ok: true })
}
