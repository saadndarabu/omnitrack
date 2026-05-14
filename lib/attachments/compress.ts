// Client-side image compression using the Canvas API.
// Must only run in browser contexts.

export type CompressionResult = {
  blob:         Blob
  width:        number
  height:       number
  originalSize: number
  compressedSize: number
  compressionRatio: number
  mimeType:     string
}

const MAX_WIDTH = 1600
const QUALITY   = 0.75

export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size

  const bitmap = await createImageBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  // Compute output dimensions, capping at MAX_WIDTH while preserving aspect ratio.
  let outW = srcW
  let outH = srcH
  if (outW > MAX_WIDTH) {
    outH = Math.round(outH * (MAX_WIDTH / outW))
    outW = MAX_WIDTH
  }

  const canvas  = document.createElement("canvas")
  canvas.width  = outW
  canvas.height = outH

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  ctx.drawImage(bitmap, 0, 0, outW, outH)
  bitmap.close()

  // Prefer WebP; fall back to JPEG if the browser returns 0 bytes for WebP.
  const blob = await tryEncode(canvas, "image/webp", QUALITY)
    ?? await tryEncode(canvas, "image/jpeg", QUALITY)

  if (!blob) throw new Error("Image encoding failed")

  const compressedSize   = blob.size
  const compressionRatio = compressedSize / originalSize

  return {
    blob,
    width:  outW,
    height: outH,
    originalSize,
    compressedSize,
    compressionRatio,
    mimeType: blob.type
  }
}

function tryEncode(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob && blob.size > 0 ? blob : null),
      mimeType,
      quality
    )
  })
}
