// Client-side upload orchestration:
//   validate → compress → upload to Storage → save metadata via API → return attachment

import { compressImage } from "@/lib/attachments/compress"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { TicketAttachment } from "@/types/attachment"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024 // 10 MB

export type UploadProgress = "validating" | "compressing" | "uploading" | "saving"

export type UploadOptions = {
  ticketId:    string
  file:        File
  onProgress?: (stage: UploadProgress) => void
}

export type UploadError = {
  type: "validation" | "compression" | "storage" | "api"
  message: string
}

export type UploadResult =
  | { ok: true;  attachment: TicketAttachment }
  | { ok: false; error: UploadError }

export async function uploadAttachment(opts: UploadOptions): Promise<UploadResult> {
  const { ticketId, file, onProgress } = opts

  // ── 1. Validate ──────────────────────────────────────────────────────────────
  onProgress?.("validating")

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: {
        type: "validation",
        message: `Unsupported file type "${file.type}". Use PNG, JPG, or WEBP.`
      }
    }
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return {
      ok: false,
      error: {
        type: "validation",
        message: `File is ${mb} MB. Maximum allowed is 10 MB.`
      }
    }
  }

  // ── 2. Compress ───────────────────────────────────────────────────────────────
  onProgress?.("compressing")

  let compressed
  try {
    compressed = await compressImage(file)
  } catch (err) {
    return {
      ok: false,
      error: {
        type: "compression",
        message: err instanceof Error ? err.message : "Compression failed"
      }
    }
  }

  // ── 3. Upload to Supabase Storage ─────────────────────────────────────────────
  onProgress?.("uploading")

  const db         = createSupabaseBrowserClient()
  const ext        = compressed.mimeType === "image/webp" ? "webp" : "jpg"
  const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  // Placeholder ID for path — we get the real UUID back from the metadata API.
  const tempId     = crypto.randomUUID()
  const storagePath = `tickets/${ticketId}/${tempId}-${safeName}.${ext}`

  const { error: storageError } = await db.storage
    .from("ticket-attachments")
    .upload(storagePath, compressed.blob, {
      contentType:  compressed.mimeType,
      cacheControl: "3600",
      upsert:       false
    })

  if (storageError) {
    return {
      ok: false,
      error: {
        type: "storage",
        message: storageError.message
      }
    }
  }

  // ── 4. Save metadata via API ──────────────────────────────────────────────────
  onProgress?.("saving")

  const resp = await fetch(`/api/tickets/${ticketId}/attachments`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName:            safeName,
      fileType:            compressed.mimeType,
      fileSize:            compressed.compressedSize,
      originalFileSize:    compressed.originalSize,
      compressedFileSize:  compressed.compressedSize,
      compressionRatio:    compressed.compressionRatio,
      storagePath,
      width:               compressed.width,
      height:              compressed.height
    })
  })

  if (!resp.ok) {
    // Roll back the storage object since we can't save metadata.
    await db.storage.from("ticket-attachments").remove([storagePath])
    const body = await resp.json().catch(() => ({}))
    return {
      ok: false,
      error: {
        type: "api",
        message: body.error ?? "Failed to save attachment metadata"
      }
    }
  }

  const attachment: TicketAttachment = await resp.json()
  return { ok: true, attachment }
}

/** Generate a short-lived signed URL for a private storage object. */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const db = createSupabaseBrowserClient()
  const { data, error } = await db.storage
    .from("ticket-attachments")
    .createSignedUrl(storagePath, 3600) // 1-hour expiry

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
