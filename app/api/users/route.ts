import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetUsers } from "@/lib/db/users"

// GET /api/users
export async function GET() {
  try {
    const db    = await createSupabaseServerClient()
    const users = await dbGetUsers(db)
    return NextResponse.json(users)
  } catch (err) {
    console.error("[GET /api/users]", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
