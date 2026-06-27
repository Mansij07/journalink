"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Image as ImageIcon, Video, LayoutList, CalendarDays, X, FileText } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MAX_CHARS = 500
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

  const [supabase] = useState(() => createClient())
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const initial = username ? username.charAt(0).toUpperCase() : "P"
  const remaining = MAX_CHARS - content.length
  const overLimit = remaining < 0
  const canPost = content.trim().length > 0 && !overLimit && !loading

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

  const handleSubmit = async () => {
    if (!canPost) return
    setLoading(true)
    setError(null)

    const media: { url: string; type: "image" | "video" }[] = []

    for (let i = 0; i < attachedMedia.length; i++) {
      const m = attachedMedia[i]
      const ext = m.file.name.split(".").pop()
      const path =
        m.type === "video"
          ? `videos/${userId}/${Date.now()}-${i}.${ext}`
          : `${userId}/${Date.now()}-${i}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, m.file, { upsert: true })
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }
      const url = supabase.storage.from("post-media").getPublicUrl(uploadData.path).data.publicUrl
      media.push({ url, type: m.type })
    }

    if (attachedDoc) {
      const ext = attachedDoc.file.name.split(".").pop()
      const { error: docError } = await supabase.storage
        .from("post-media")
        .upload(`docs/${userId}/${Date.now()}.${ext}`, attachedDoc.file, { upsert: true })
      if (docError) {
        setError(`Document upload failed: ${docError.message}`)
        setLoading(false)
        return
      }
    }

    const { error: insertError } = await supabase
      .from("post")
      .insert({
        content: content.trim(),
        author_id: userId,
        category: "Announcement",
        ...(media.length > 0 && { media }),
      })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContent("")
      clearAttachments()
      onPostCreated()
    }

    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-3">
        <Avatar className="size-10 shrink-0 mt-1">
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
          )}
          <AvatarFallback className="bg-[#1D9BF0]/15 text-[#1D9BF0] text-sm font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            placeholder="What's happening on campus?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full bg-transparent resize-none pt-2 text-[18px] placeholder:text-muted-foreground focus-visible:ring-0 leading-relaxed border-none shadow-none p-0"
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
                    <Video className="size-3 shrink-0 text-blue-400" />
                  ) : (
                    <ImageIcon className="size-3 shrink-0 text-green-400" />
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
                  <FileText className="size-3 shrink-0 text-[#1D9BF0]" />
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

          {error && <p className="text-[13px] text-destructive mt-1">{error}</p>}
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
            disabled
            className="rounded-full text-[13px]"
            aria-label="Schedule (coming soon)"
          >
            <CalendarDays data-icon="inline-start" className="text-violet-400" />
            Schedule
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span
              className={cn(
                "text-[13px] tabular-nums",
                overLimit
                  ? "text-destructive font-bold"
                  : remaining < 50
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              )}
            >
              {remaining}
            </span>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canPost}
            className="rounded-full text-[14px] font-bold"
          >
            {loading ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={handleVideoSelect} />
      <input ref={docInputRef} type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={handleDocSelect} />
    </div>
  )
}
