"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from "@/components/ui/field"

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter()

  const [fullName, setFullName] = React.useState(profile.full_name ?? "")
  const [bio, setBio] = React.useState(profile.bio ?? "")
  const [branch, setBranch] = React.useState(profile.branch ?? "")
  const [year, setYear] = React.useState(profile.year ? String(profile.year) : "")
  const [skills, setSkills] = React.useState((profile.skills ?? []).join(", "))
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url ?? "")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
    setSaved(false)
  }

  const displayName = fullName || profile.username || "U"
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    let nextAvatarUrl = avatarUrl

    if (avatarFile) {
      const fd = new FormData()
      fd.append("file", avatarFile)
      fd.append("bucket", "avatars")
      fd.append("kind", "avatar")
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!uploadRes.ok) {
        setSaving(false)
        const { error: msg } = await uploadRes.json().catch(() => ({ error: "upload failed" }))
        setError(`Avatar upload failed: ${msg}`)
        return
      }
      const { url } = await uploadRes.json()
      nextAvatarUrl = url
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        branch: branch.trim() || null,
        year: year ? Number(year) : null,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        avatar_url: nextAvatarUrl || null,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Update failed" }))
      setError(msg ?? "Update failed")
      return
    }

    setAvatarUrl(nextAvatarUrl)
    setAvatarFile(null)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {/* Avatar */}
        <Field orientation="horizontal" className="items-center">
          <Avatar size="lg" className="size-16">
            {(preview || avatarUrl) && (
              <AvatarImage src={preview || avatarUrl} alt="" />
            )}
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                Change photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={onPickAvatar}
                />
              </label>
            </Button>
            <FieldDescription>PNG, JPG or WebP.</FieldDescription>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 @md/field-group:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="settings-username">Username</FieldLabel>
            <Input id="settings-username" value={profile.username ?? ""} disabled readOnly />
            <FieldDescription>Your username can&apos;t be changed.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-fullname">Full name</FieldLabel>
            <Input
              id="settings-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="settings-bio">Bio</FieldLabel>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself."
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 @md/field-group:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="settings-branch">Branch</FieldLabel>
            <Input
              id="settings-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-year">Year</FieldLabel>
            <Input
              id="settings-year"
              type="number"
              min={1}
              max={6}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 3"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="settings-skills">Skills</FieldLabel>
          <Input
            id="settings-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Python, Research, Writing"
          />
          <FieldDescription>Comma-separated.</FieldDescription>
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
        </div>
      </FieldGroup>
    </form>
  )
}
