import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dbGetAttachments, dbCreateAttachment } from "@/lib/db/attachments"
import { dbGetCurrentUser } from "@/lib/db/users"

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tickets/[id]/attachments
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()
    const items  = await dbGetAttachments(db, id)
    return NextResponse.json(items)
  } catch (err) {
    console.error("[GET /api/tickets/[id]/attachments]", err)
    return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 })
  }
}

// POST /api/tickets/[id]/attachments
// Body: CreateAttachmentInput fields (all except ticketId, which comes from the route)
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db     = await createSupabaseServerClient()
    const body   = await request.json()
    const currentUser = await dbGetCurrentUser(db)

    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (currentUser.role !== "member" && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to upload screenshots" },
        { status: 403 }
      )
    }

    const required = ["fileName", "fileType", "fileSize", "originalFileSize", "compressedFileSize", "compressionRatio", "storagePath"]
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 })
      }
    }

    const attachment = await dbCreateAttachment(db, {
      ticketId:            id,
      uploadedBy:          currentUser.id,
      fileName:            body.fileName,
      fileType:            body.fileType,
      fileSize:            body.fileSize,
      originalFileSize:    body.originalFileSize,
      compressedFileSize:  body.compressedFileSize,
      compressionRatio:    body.compressionRatio,
      storagePath:         body.storagePath,
      width:               body.width ?? null,
      height:              body.height ?? null
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (err) {
    console.error("[POST /api/tickets/[id]/attachments]", err)
    return NextResponse.json({ error: "Failed to create attachment record" }, { status: 500 })
  }
}
