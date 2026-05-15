// Client-side avatar upload: compress → upload to avatars bucket → return signed URL.
// Mirrors the pattern in lib/attachments/upload.ts.

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { compressImage } from "./compress"

const BUCKET = "avatars"
const SIGNED_URL_TTL = 60 * 60 * 24 * 7 // 7 days — longer than ticket attachments

export type AvatarUploadResult = {
  storagePath: string
  signedUrl:   string
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<AvatarUploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported for avatars")
  }

  const compressed = await compressImage(file)

  const ext      = compressed.mimeType === "image/webp" ? "webp" : "jpg"
  const path     = `${userId}/avatar.${ext}`
  const supabase = createSupabaseBrowserClient()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed.blob, {
      contentType: compressed.mimeType,
      upsert: true, // always replace — one avatar per user
    })

  if (uploadError) throw uploadError

  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (urlError || !urlData) throw urlError ?? new Error("Failed to generate signed URL")

  return {
    storagePath: path,
    signedUrl:   urlData.signedUrl,
  }
}

export async function getAvatarSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}
