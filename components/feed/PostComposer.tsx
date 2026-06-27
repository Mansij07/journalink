"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Image as ImageIcon, Video, LayoutList, CalendarDays, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_CHARS = 500

interface PostComposerProps {
  userId: string
  username?: string
  avatarUrl?: string | null
  onPostCreated: () => void
}

export function PostComposer({ userId, username, avatarUrl, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string } | null>(null)
  const [attachedDoc, setAttachedDoc] = useState<{ file: File } | null>(null)

  const [supabase] = useState(() => createClient())
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const initial = username ? username.charAt(0).toUpperCase() : "P"
  const remaining = MAX_CHARS - content.length
  const overLimit = remaining < 0
  const canPost = content.trim().length > 0 && !overLimit && !loading

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImage({ file, preview: URL.createObjectURL(file) })
    e.target.value = ""
  }

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedDoc({ file })
    e.target.value = ""
  }

  const clearAttachments = () => {
    if (attachedImage) URL.revokeObjectURL(attachedImage.preview)
    setAttachedImage(null)
    setAttachedDoc(null)
  }

  const handleSubmit = async () => {
    if (!canPost) return
    setLoading(true)
    setError(null)

    let imageUrl: string | null = null

    if (attachedImage) {
      const ext = attachedImage.file.name.split(".").pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, attachedImage.file, { upsert: true })
      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }
      imageUrl = supabase.storage.from("post-media").getPublicUrl(uploadData.path).data.publicUrl
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
        ...(imageUrl && { image_url: imageUrl }),
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
    <div className="rounded-2xl border border-[#2F3336] bg-[#16181C] p-5">
      {/* Avatar + textarea row */}
      <div className="flex gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-10 h-10 rounded-full object-cover shrink-0 mt-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#1D9BF0]/15 flex items-center justify-center shrink-0 text-sm font-bold text-[#1D9BF0] mt-1 select-none">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <textarea
            placeholder="What's happening on campus?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full bg-transparent resize-none pt-2 text-[18px] text-white placeholder:text-[#71767B] focus:outline-none leading-relaxed"
          />

          {/* Attachment chips */}
          {(attachedImage || attachedDoc) && (
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {attachedImage && (
                <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-white/8 text-[#71767B]">
                  <ImageIcon className="size-3 shrink-0 text-[#1D9BF0]" />
                  <span className="truncate max-w-[120px]">{attachedImage.file.name}</span>
                  <button
                    onClick={() => { URL.revokeObjectURL(attachedImage.preview); setAttachedImage(null) }}
                    className="text-[#71767B] hover:text-white transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {attachedDoc && (
                <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-white/8 text-[#71767B]">
                  <FileText className="size-3 shrink-0 text-[#1D9BF0]" />
                  <span className="truncate max-w-[120px]">{attachedDoc.file.name}</span>
                  <button onClick={() => setAttachedDoc(null)} className="text-[#71767B] hover:text-white transition-colors" aria-label="Remove document">
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {error && <p className="text-[13px] text-red-500 mt-1">{error}</p>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#2F3336] mt-3 mb-3" />

      {/* Bottom row — pill buttons + char counter + Post */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Photo */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2F3336] text-[13px] text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Attach photo"
          >
            <ImageIcon className="size-4 text-green-400" />
            Photo
          </button>

          {/* Video — placeholder */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2F3336] text-[13px] text-[#71767B] cursor-not-allowed opacity-60"
            disabled
            aria-label="Video (coming soon)"
          >
            <Video className="size-4 text-blue-400" />
            Video
          </button>

          {/* Thread — doc upload */}
          <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2F3336] text-[13px] text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Attach document"
          >
            <LayoutList className="size-4 text-orange-400" />
            Thread
          </button>

          {/* Schedule — placeholder */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2F3336] text-[13px] text-[#71767B] cursor-not-allowed opacity-60"
            disabled
            aria-label="Schedule (coming soon)"
          >
            <CalendarDays className="size-4 text-violet-400" />
            Schedule
          </button>
        </div>

        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span
              className={cn(
                "text-[13px] tabular-nums",
                overLimit
                  ? "text-red-500 font-bold"
                  : remaining < 50
                  ? "text-yellow-500"
                  : "text-[#71767B]"
              )}
            >
              {remaining}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canPost}
            className={cn(
              "px-5 py-1.5 rounded-full text-[14px] font-bold transition-all",
              canPost
                ? "bg-[#1D9BF0] text-white hover:bg-[#1A8CD8] cursor-pointer"
                : "bg-[#1D9BF0]/40 text-white/50 cursor-not-allowed"
            )}
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input ref={docInputRef} type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={handleDocSelect} />
    </div>
  )
}
