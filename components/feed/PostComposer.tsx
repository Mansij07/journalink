"use client"

import { useState, useRef } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Image as ImageIcon, Video, LayoutList, CalendarDays, X, FileText, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { MentionInput } from "./MentionInput"

const MAX_MEDIA = 4

interface PostComposerProps {
  userId: string
  username?: string
  avatarUrl?: string | null
  onPostCreated: () => void
}

interface MediaAttachment {
  file: File
  preview: string
  type: "image" | "video"
}

export function PostComposer({ userId, username, avatarUrl, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [attachedMedia, setAttachedMedia] = useState<MediaAttachment[]>([])
  const [attachedDoc, setAttachedDoc] = useState<{ file: File } | null>(null)

  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined)
  const [draftTime, setDraftTime] = useState("")
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const initial = username ? username.charAt(0).toUpperCase() : "P"
  const canPost = content.trim().length > 0 && !loading

  const addMedia = (files: FileList | null, type: "image" | "video") => {
    if (!files) return
    setError(null)
    setAttachedMedia((prev) => {
      const room = MAX_MEDIA - prev.length
      if (room <= 0) {
        setError(`You can attach up to ${MAX_MEDIA} media items.`)
        return prev
      }
      const incoming = Array.from(files)
        .slice(0, room)
        .map((file) => ({ file, preview: URL.createObjectURL(file), type }))
      return [...prev, ...incoming]
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addMedia(e.target.files, "image")
    e.target.value = ""
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addMedia(e.target.files, "video")
    e.target.value = ""
  }

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedDoc({ file })
    e.target.value = ""
  }

  const removeMedia = (index: number) => {
    setAttachedMedia((prev) => {
      const item = prev[index]
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearAttachments = () => {
    attachedMedia.forEach((m) => URL.revokeObjectURL(m.preview))
    setAttachedMedia([])
    setAttachedDoc(null)
  }

  const openScheduler = () => {
    setScheduleError(null)
    setDraftDate(scheduledAt ?? undefined)
    setDraftTime(scheduledAt ? format(scheduledAt, "HH:mm") : "")
    setScheduleOpen(true)
  }

  const confirmSchedule = () => {
    if (!draftDate || !draftTime) {
      setScheduleError("Pick a date and time.")
      return
    }
    const [h, m] = draftTime.split(":").map(Number)
    const when = new Date(draftDate)
    when.setHours(h, m, 0, 0)
    if (when.getTime() <= Date.now()) {
      setScheduleError("Schedule time must be in the future.")
      return
    }
    setScheduledAt(when)
    setScheduleOpen(false)
  }

  const handleSubmit = async () => {
    if (!canPost) return
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      setError("Schedule time must be in the future.")
      return
    }
    setLoading(true)
    setError(null)

    const media: { url: string; type: "image" | "video" }[] = []

    const uploadFile = async (file: File, kind: "image" | "video" | "doc") => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("bucket", "post-media")
      fd.append("kind", kind)
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "upload failed" }))
        throw new Error(msg)
      }
      const { url } = await res.json()
      return url as string
    }

    try {
      for (const m of attachedMedia) {
        const url = await uploadFile(m.file, m.type)
        media.push({ url, type: m.type })
      }
      if (attachedDoc) {
        await uploadFile(attachedDoc.file, "doc")
      }
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`)
      setLoading(false)
      return
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        ...(media.length > 0 && { media }),
        ...(scheduledAt && { scheduledAt: scheduledAt.toISOString() }),
      }),
    })

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Post failed" }))
      setError(msg ?? "Post failed")
    } else {
      const { id } = await res.json().catch(() => ({ id: null }))
      setContent("")
      clearAttachments()
      setScheduledAt(null)
      onPostCreated()
      toast.success(scheduledAt ? "Post scheduled" : "Posted", {
        action: id
          ? {
              label: "Undo",
              onClick: async () => {
                const del = await fetch(`/api/posts/${id}`, { method: "DELETE" })
                if (del.ok) {
                  toast.success("Post deleted")
                  onPostCreated()
                } else {
                  toast.error("Couldn't undo — post may already be gone")
                }
              },
            }
          : undefined,
      })
    }

    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex gap-3">
        <Avatar className="size-10 shrink-0 mt-1">
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
          )}
          <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <MentionInput
            placeholder="What's happening on campus? Use @ to tag people you follow."
            value={content}
            onChange={setContent}
            currentUserId={userId}
            rows={2}
            className="w-full bg-transparent resize-none px-2 py-2 text-[18px] placeholder:text-muted-foreground focus-visible:ring-0 leading-relaxed border-none shadow-none"
          />

          {(attachedMedia.length > 0 || attachedDoc) && (
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {attachedMedia.map((m, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-normal"
                >
                  {m.type === "video" ? (
                    <Video className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate max-w-[120px]">{m.file.name}</span>
                  <button
                    onClick={() => removeMedia(i)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove media"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {attachedDoc && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-normal"
                >
                  <FileText className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{attachedDoc.file.name}</span>
                  <button
                    onClick={() => setAttachedDoc(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove document"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {scheduledAt && (
            <div className="mt-1 mb-2">
              <Badge
                variant="secondary"
                className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-normal"
              >
                <Clock className="size-3 shrink-0 text-violet-400" />
                <span>Scheduled for {format(scheduledAt, "MMM d, h:mm a")}</span>
                <button
                  onClick={() => setScheduledAt(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove schedule"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </div>
          )}

          {error && <p className="text-[13px] text-error mt-1">{error}</p>}
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-full text-[13px]"
            aria-label="Attach photo"
          >
            <ImageIcon data-icon="inline-start" className="text-green-400" />
            Photo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            className="rounded-full text-[13px]"
            aria-label="Attach video"
          >
            <Video data-icon="inline-start" className="text-blue-400" />
            Video
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => docInputRef.current?.click()}
            className="rounded-full text-[13px]"
            aria-label="Attach document"
          >
            <LayoutList data-icon="inline-start" className="text-orange-400" />
            Thread
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openScheduler}
            className="rounded-full text-[13px]"
            aria-label="Schedule post"
          >
            <CalendarDays data-icon="inline-start" className="text-violet-400" />
            {scheduledAt ? "Edit schedule" : "Schedule"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!canPost}
            className="rounded-full text-[14px] font-bold"
          >
            {loading ? "Posting…" : scheduledAt ? "Schedule" : "Post"}
          </Button>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={handleVideoSelect} />
      <input ref={docInputRef} type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={handleDocSelect} />

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="w-fit">
          <DialogHeader>
            <DialogTitle>Schedule post</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <Calendar
              mode="single"
              selected={draftDate}
              onSelect={setDraftDate}
              disabled={{ before: new Date() }}
            />
            <div className="flex w-full items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <Input
                type="time"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
                className="w-full"
                aria-label="Schedule time"
              />
            </div>
            {scheduleError && <p className="w-full text-[13px] text-error">{scheduleError}</p>}
          </div>

          <DialogFooter>
            {scheduledAt && (
              <Button
                variant="ghost"
                onClick={() => {
                  setScheduledAt(null)
                  setScheduleOpen(false)
                }}
                className="rounded-full"
              >
                Clear
              </Button>
            )}
            <Button onClick={confirmSchedule} className="rounded-full font-bold">
              Set time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
