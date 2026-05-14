import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbAddComment, dbDeleteComment } from "@/lib/db/tickets"

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/tickets/[id]/comments
// Body: { authorId: string; body: string }
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id }            = await params
    const db                = await createSupabaseServerClient()
    const { authorId, body } = await request.json()

    if (!authorId || !body) {
      return NextResponse.json({ error: "authorId and body are required" }, { status: 400 })
    }

    const comment = await dbAddComment(db, id, authorId, body)
    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    console.error("[POST /api/tickets/[id]/comments]", err)
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 })
  }
}

// DELETE /api/tickets/[id]/comments?commentId=...
export async function DELETE(request: Request, { params: _params }: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    const commentId        = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json({ error: "commentId query param is required" }, { status: 400 })
    }

    const db = await createSupabaseServerClient()
    await dbDeleteComment(db, commentId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]/comments]", err)
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 })
  }
}
