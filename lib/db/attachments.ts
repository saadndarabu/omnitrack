import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, TicketAttachmentRow } from "@/types/database"
import type { TicketAttachment } from "@/types/attachment"
import type { User } from "@/types/user"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<Database, any, any>

type UserRow = Database["public"]["Tables"]["users"]["Row"]

type AttachmentRowWithUploader = TicketAttachmentRow & {
  uploader: UserRow
}

function rowToUser(row: UserRow): User {
  return {
    id:       row.id,
    name:     row.name,
    email:    row.email as User["email"],
    initials: row.initials,
    role:     row.role as User["role"]
  }
}

function rowToAttachment(row: AttachmentRowWithUploader): TicketAttachment {
  return {
    id:                 row.id,
    ticketId:           row.ticket_id,
    uploadedBy:         rowToUser(row.uploader),
    fileName:           row.file_name,
    fileType:           row.file_type,
    fileSize:           row.file_size,
    originalFileSize:   row.original_file_size,
    compressedFileSize: row.compressed_file_size,
    compressionRatio:   row.compression_ratio,
    storageBucket:      row.storage_bucket,
    storagePath:        row.storage_path,
    width:              row.width,
    height:             row.height,
    createdAt:          row.created_at
  }
}

const ATTACHMENT_SELECT = `
  *,
  uploader:users!ticket_attachments_uploaded_by_fkey(*)
` as const

export async function dbGetAttachments(
  db: Db,
  ticketId: string
): Promise<TicketAttachment[]> {
  const { data, error } = await db
    .from("ticket_attachments")
    .select(ATTACHMENT_SELECT)
    .eq("ticket_id", ticketId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data as AttachmentRowWithUploader[]).map(rowToAttachment)
}

export type CreateAttachmentInput = {
  ticketId:            string
  uploadedBy:          string
  fileName:            string
  fileType:            string
  fileSize:            number
  originalFileSize:    number
  compressedFileSize:  number
  compressionRatio:    number
  storagePath:         string
  width:               number | null
  height:              number | null
}

export async function dbCreateAttachment(
  db: Db,
  input: CreateAttachmentInput
): Promise<TicketAttachment> {
  const { data, error } = await db
    .from("ticket_attachments")
    .insert({
      ticket_id:            input.ticketId,
      uploaded_by:          input.uploadedBy,
      file_name:            input.fileName,
      file_type:            input.fileType,
      file_size:            input.fileSize,
      original_file_size:   input.originalFileSize,
      compressed_file_size: input.compressedFileSize,
      compression_ratio:    input.compressionRatio,
      storage_bucket:       "ticket-attachments",
      storage_path:         input.storagePath,
      width:                input.width,
      height:               input.height
    })
    .select(ATTACHMENT_SELECT)
    .single()

  if (error) throw error
  return rowToAttachment(data as AttachmentRowWithUploader)
}

export async function dbSoftDeleteAttachment(
  db: Db,
  attachmentId: string
): Promise<void> {
  const { error } = await db
    .from("ticket_attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", attachmentId)

  if (error) throw error
}

export async function dbGetAttachmentCounts(
  db: Db,
  ticketIds: string[]
): Promise<Record<string, number>> {
  if (ticketIds.length === 0) return {}

  const { data, error } = await db
    .from("ticket_attachments")
    .select("ticket_id")
    .in("ticket_id", ticketIds)
    .is("deleted_at", null)

  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.ticket_id] = (counts[row.ticket_id] ?? 0) + 1
  }
  return counts
}
