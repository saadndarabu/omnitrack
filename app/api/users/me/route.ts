import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser, dbUpdateProfile } from "@/lib/db/users"
import type { UserArea } from "@/types/user"

// GET /api/users/me
export async function GET() {
  try {
    const db   = await createSupabaseServerClient()
    const user = await dbGetCurrentUser(db)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    return NextResponse.json(user)
  } catch (err) {
    console.error("[GET /api/users/me]", err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PATCH /api/users/me — update name, areas, avatar_url
export async function PATCH(request: Request) {
  try {
    const db   = await createSupabaseServerClient()
    const user = await dbGetCurrentUser(db)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const body = await request.json() as {
      name?:       string
      areas?:      UserArea[]
      avatar_url?: string | null
    }

    const patch: Parameters<typeof dbUpdateProfile>[2] = {}

    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      patch.name = trimmed
    }

    if (body.areas !== undefined)      patch.areas      = body.areas
    if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url

    const updated = await dbUpdateProfile(db, user.id, patch)
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/users/me]", err)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
