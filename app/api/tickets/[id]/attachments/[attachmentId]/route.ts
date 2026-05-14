import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbSoftDeleteAttachment } from "@/lib/db/attachments"

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> }

// DELETE /api/tickets/[id]/attachments/[attachmentId]
// Soft-deletes the attachment record. Storage object cleanup is handled by a
// Supabase scheduled function or manual admin action — we do not delete from
// storage here to keep the route fast and avoid credential-scope issues.
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { attachmentId } = await params
    const db               = await createSupabaseServerClient()

    await dbSoftDeleteAttachment(db, attachmentId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]/attachments/[attachmentId]]", err)
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 })
  }
}
