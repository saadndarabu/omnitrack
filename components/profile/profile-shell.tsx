"use client"

import { useRef, useState, useTransition } from "react"
import { Camera, Check, Loader2 } from "lucide-react"
import Image from "next/image"
import type { User, UserArea } from "@/types/user"
import { USER_AREA_LABELS } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadAvatar } from "@/lib/attachments/avatar"
import { cn } from "@/lib/utils"

const ALL_AREAS = Object.keys(USER_AREA_LABELS) as UserArea[]

export function ProfileShell({ user: initialUser }: { user: User }) {
  const [user,    setUser]    = useState(initialUser)
  const [name,    setName]    = useState(initialUser.name)
  const [areas,   setAreas]   = useState<UserArea[]>(initialUser.areas)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialUser.avatarUrl)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [, startTransition]   = useTransition()
  const fileInputRef          = useRef<HTMLInputElement>(null)

  function toggleArea(area: UserArea) {
    setAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
    setSaved(false)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setSaved(false)
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      // avatar_url in the DB stores the storage path so it can be re-signed.
      // The local preview uses the object URL or the existing signed URL.
      let newStoragePath: string | undefined

      if (avatarFile) {
        const result = await uploadAvatar(avatarFile, user.id)
        newStoragePath = result.storagePath
        // Update preview to the fresh signed URL
        setAvatarPreview(result.signedUrl)
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:  name.trim(),
          areas,
          ...(newStoragePath !== undefined ? { avatar_url: newStoragePath } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? "Save failed")
      }

      const updated = await res.json() as User
      setUser(updated)
      setAvatarFile(null)
      startTransition(() => setSaved(true))
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    name.trim() !== user.name ||
    JSON.stringify([...areas].sort()) !== JSON.stringify([...user.areas].sort()) ||
    avatarFile !== null

  const initials = user.initials

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text)]">
          Profile
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {user.email}
        </p>
      </div>

      <div className="space-y-7">
        {/* Avatar */}
        <section>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-faint)]">
            Profile picture
          </label>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] transition-opacity hover:opacity-90 focus-visible:outline-none"
              aria-label="Change profile picture"
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt={user.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-[var(--text-muted)]">
                  {initials}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={16} className="text-white" />
              </span>
            </button>
            <div>
              <Button variant="quiet" onClick={() => fileInputRef.current?.click()}>
                Upload photo
              </Button>
              <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                PNG, JPG or WebP — compressed automatically
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </section>

        {/* Name */}
        <section>
          <label
            htmlFor="profile-name"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-faint)]"
          >
            Display name
          </label>
          <Input
            id="profile-name"
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            placeholder="Your name"
            className="h-9 max-w-sm"
          />
        </section>

        {/* Areas of responsibility */}
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-faint)]">
            Areas of responsibility
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_AREAS.map(area => {
              const active = areas.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={cn(
                    "h-7 rounded-[6px] border px-2.5 text-[12px] font-medium transition-colors duration-[120ms]",
                    active
                      ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                  )}
                >
                  {USER_AREA_LABELS[area]}
                </button>
              )
            })}
          </div>
          {areas.length === 0 && (
            <p className="mt-2 text-[12px] text-[var(--text-faint)]">
              Select one or more areas
            </p>
          )}
        </section>

        {/* Role (read-only) */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-faint)]">
            Role
          </p>
          <span className="inline-flex h-7 items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[12px] font-medium capitalize text-[var(--text-muted)]">
            {user.role}
          </span>
          <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
            Contact an admin to change your role.
          </p>
        </section>

        {/* Save */}
        {error && (
          <p className="text-[13px] text-[var(--status-blocked)]">{error}</p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <><Check size={14} /> Saved</>
            ) : (
              "Save changes"
            )}
          </Button>
          {isDirty && !saving && (
            <button
              type="button"
              onClick={() => {
                setName(user.name)
                setAreas(user.areas)
                setAvatarPreview(user.avatarUrl)
                setAvatarFile(null)
                setError(null)
              }}
              className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
