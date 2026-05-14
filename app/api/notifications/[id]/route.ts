import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbMarkRead } from "@/lib/db/notifications"

// PATCH /api/notifications/[id] — mark single notification read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = await createSupabaseServerClient()
  await dbMarkRead(db, id)
  return NextResponse.json({ ok: true })
}
