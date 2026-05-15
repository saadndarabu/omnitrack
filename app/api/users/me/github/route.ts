import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetCurrentUser, dbConnectGitHub, dbDisconnectGitHub } from "@/lib/db/users"

// POST /api/users/me/github — initiate GitHub OAuth or store identity after callback
// Body: { github_username: string, github_email: string }
export async function POST(request: Request) {
  try {
    const db   = await createSupabaseServerClient()
    const user = await dbGetCurrentUser(db)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const body = await request.json() as { github_username: string; github_email: string }
    if (!body.github_username) {
      return NextResponse.json({ error: "github_username is required" }, { status: 400 })
    }

    await dbConnectGitHub(db, user.id, body.github_username, body.github_email ?? "")
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/users/me/github]", err)
    return NextResponse.json({ error: "Failed to connect GitHub" }, { status: 500 })
  }
}

// DELETE /api/users/me/github — disconnect GitHub
export async function DELETE() {
  try {
    const db   = await createSupabaseServerClient()
    const user = await dbGetCurrentUser(db)
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    await dbDisconnectGitHub(db, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/users/me/github]", err)
    return NextResponse.json({ error: "Failed to disconnect GitHub" }, { status: 500 })
  }
}
