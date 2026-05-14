"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"
import {
  ImageIcon,
  Loader2,
  Maximize2,
  Paperclip,
  Trash2,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadAttachment, getSignedUrl, type UploadProgress } from "@/lib/attachments/upload"
import { useToast } from "@/components/toast"
import { relTime } from "@/lib/rel-time"
import type { TicketAttachment } from "@/types/attachment"
import type { User } from "@/types/user"

// ── Permission helpers ────────────────────────────────────────────────────────

function canUpload(user: User) {
  return user.role === "member" || user.role === "admin"
}

function canDeleteAttachment(user: User, attachment: TicketAttachment) {
  if (user.role === "admin") return true
  if (user.role === "member" && attachment.uploadedBy.id === user.id) return true
  return false
}

// ── Progress label ────────────────────────────────────────────────────────────

const PROGRESS_LABELS: Record<UploadProgress, string> = {
  validating:  "Validating…",
  compressing: "Compressing…",
  uploading:   "Uploading…",
  saving:      "Saving…"
}

// ── Format bytes ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── TicketAttachments ─────────────────────────────────────────────────────────

export function TicketAttachments({
  ticketId,
  currentUser
}: {
  ticketId:    string
  currentUser: User
}) {
  const toast = useToast()

  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState<UploadProgress | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [preview, setPreview]         = useState<TicketAttachment | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load attachments ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`)
      if (!res.ok) throw new Error("Failed to load")
      const data: TicketAttachment[] = await res.json()

      // Populate signed URLs for all items in parallel.
      const withUrls = await Promise.all(
        data.map(async (a) => ({
          ...a,
          signedUrl: (await getSignedUrl(a.storagePath)) ?? undefined
        }))
      )
      setAttachments(withUrls)
    } catch {
      toast("Failed to load attachments", "error")
    } finally {
      setLoading(false)
    }
  }, [ticketId, toast])

  useEffect(() => { load() }, [load])

  // ── Clipboard paste (Cmd+V / Ctrl+V) ───────────────────────────────────────

  useEffect(() => {
    if (!canUpload(currentUser)) return

    async function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItem = items.find((item) => item.type.startsWith("image/"))
      if (!imageItem) return
      const file = imageItem.getAsFile()
      if (!file) return
      // Give the file a readable name
      const named = new File(
        [file],
        `paste-${Date.now()}.${file.type.split("/")[1] || "png"}`,
        { type: file.type }
      )
      await runUpload(named)
    }

    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, ticketId])

  // ── Upload handler ──────────────────────────────────────────────────────────

  async function runUpload(file: File) {
    if (uploading) return
    setUploading(true)
    setProgress("validating")

    const result = await uploadAttachment({
      ticketId,
      file,
      onProgress: setProgress
    })

    setUploading(false)
    setProgress(null)

    if (result.ok) {
      const signedUrl = (await getSignedUrl(result.attachment.storagePath)) ?? undefined
      setAttachments((prev) => [...prev, { ...result.attachment, signedUrl }])
      toast("Screenshot attached", "success")
    } else {
      toast(result.error.message, "error")
    }
  }

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (arr.length === 0) {
      toast("No supported image files found", "error")
      return
    }
    // Upload sequentially to avoid swamping bandwidth
    arr.reduce<Promise<void>>(
      (chain, file) => chain.then(() => runUpload(file)),
      Promise.resolve()
    )
  }

  // ── Delete handler ──────────────────────────────────────────────────────────

  async function handleDelete(attachment: TicketAttachment) {
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/attachments/${attachment.id}`,
        { method: "DELETE" }
      )
      if (!res.ok && res.status !== 204) throw new Error()
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
      if (preview?.id === attachment.id) setPreview(null)
      toast("Attachment removed", "success")
    } catch {
      toast("Failed to remove attachment", "error")
    }
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (!canUpload(currentUser)) return
    handleFiles(e.dataTransfer.files)
  }

  const allowUpload = canUpload(currentUser)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-[var(--text-faint)]">Screenshots</span>
        {attachments.length > 0 && (
          <span className="text-[11px] text-[var(--text-faint)]">{attachments.length}</span>
        )}
      </div>

      {/* Dropzone — only for users who can upload */}
      {allowUpload && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload screenshots"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click() }}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors duration-150",
            dragOver
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
              <span className="text-[12px] text-[var(--text-muted)]">
                {progress ? PROGRESS_LABELS[progress] : "Working…"}
              </span>
            </div>
          ) : (
            <>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                <Paperclip size={15} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[12px] font-medium text-[var(--text-muted)]">
                Drop screenshots here, paste from clipboard, or click to upload
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                PNG, JPG, WEBP · compressed automatically
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>
      )}

      {/* Attachment grid */}
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-[12px] text-[var(--text-faint)]">
          <Loader2 size={13} className="animate-spin" />
          Loading…
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-[12px] text-[var(--text-faint)]">
          No screenshots attached yet. Paste, drag, or upload screenshots to add visual context.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <AttachmentThumbnail
              key={attachment.id}
              attachment={attachment}
              currentUser={currentUser}
              onPreview={() => setPreview(attachment)}
              onDelete={() => handleDelete(attachment)}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          attachment={preview}
          currentUser={currentUser}
          onClose={() => setPreview(null)}
          onDelete={() => handleDelete(preview)}
        />
      )}
    </div>
  )
}

// ── AttachmentThumbnail ───────────────────────────────────────────────────────

function AttachmentThumbnail({
  attachment,
  currentUser,
  onPreview,
  onDelete
}: {
  attachment:  TicketAttachment
  currentUser: User
  onPreview:   () => void
  onDelete:    () => void
}) {
  const showDelete = canDeleteAttachment(currentUser, attachment)

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      {/* Thumbnail image */}
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${attachment.fileName}`}
        className="block w-full"
      >
        {attachment.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.signedUrl}
            alt={attachment.fileName}
            className="h-[100px] w-full object-cover transition-opacity duration-150 group-hover:opacity-80"
            loading="lazy"
          />
        ) : (
          <div className="flex h-[100px] w-full items-center justify-center">
            <ImageIcon size={24} className="text-[var(--text-faint)]" />
          </div>
        )}
      </button>

      {/* Hover overlay actions */}
      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <ActionButton label="Expand" onClick={onPreview}>
          <Maximize2 size={12} />
        </ActionButton>
        {showDelete && (
          <ActionButton label="Delete" onClick={onDelete} danger>
            <Trash2 size={12} />
          </ActionButton>
        )}
      </div>

      {/* Meta footer */}
      <div className="border-t border-[var(--border)] px-2 py-1.5">
        <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">
          {attachment.fileName}
        </p>
        <p className="text-[10px] text-[var(--text-faint)]">
          {attachment.uploadedBy.name} · {relTime(attachment.createdAt)}
        </p>
      </div>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  danger = false,
  children
}: {
  label:    string
  onClick:  () => void
  danger?:  boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--border)] backdrop-blur-sm transition-colors",
        danger
          ? "bg-[color-mix(in_srgb,var(--status-blocked)_90%,transparent)] text-white hover:bg-[var(--status-blocked)]"
          : "bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] text-[var(--text)] hover:bg-[var(--surface)]"
      )}
    >
      {children}
    </button>
  )
}

// ── PreviewModal ──────────────────────────────────────────────────────────────

function PreviewModal({
  attachment,
  currentUser,
  onClose,
  onDelete
}: {
  attachment:  TicketAttachment
  currentUser: User
  onClose:     () => void
  onDelete:    () => void
}) {
  const showDelete = canDeleteAttachment(currentUser, attachment)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const kb = (attachment.compressedFileSize / 1024).toFixed(0)
  const savedPct = Math.round((1 - attachment.compressionRatio) * 100)

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">
              {attachment.fileName}
            </p>
            <p className="text-[11px] text-[var(--text-faint)]">
              {attachment.width && attachment.height
                ? `${attachment.width}×${attachment.height} · `
                : ""}
              {kb} KB compressed
              {savedPct > 0 ? ` · saved ${savedPct}%` : ""}
              {" · "}
              {attachment.uploadedBy.name}
              {" · "}
              {relTime(attachment.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {showDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); onClose() }}
                aria-label="Delete attachment"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--status-blocked)_36%,transparent)] bg-[color-mix(in_srgb,var(--status-blocked)_10%,transparent)] px-2.5 text-[12px] font-medium text-[var(--status-blocked)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-blocked)_18%,transparent)]"
              >
                <Trash2 size={13} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--bg)] p-4">
          {attachment.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.signedUrl}
              alt={attachment.fileName}
              className="max-h-[70vh] max-w-full rounded-lg object-contain shadow"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-[var(--text-faint)]">
              <ImageIcon size={32} />
              <p className="text-[13px]">Preview unavailable</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
