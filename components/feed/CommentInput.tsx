"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface CommentInputProps {
  postId: string
  userId: string
  onCommentAdded: () => void
}

export function CommentInput({ postId, userId, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!content.trim()) return

    setLoading(true)
    setError(null)
    
    const { error: insertError } = await supabase
      .from('comments')
      .insert({ post_id: postId, content, author_id: userId })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContent("")
      onCommentAdded()
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-[#2F3336]">
      <div className="w-10 h-10 rounded-full bg-[#2F3336] flex items-center justify-center shrink-0 text-sm font-bold text-white">
        U
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <textarea
          placeholder="Post your reply"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full bg-transparent resize-none text-[15px] text-white placeholder:text-[#71767B] focus:outline-none leading-relaxed"
        />
        {error && <p className="text-[13px] text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="px-5 py-1.5 rounded-full text-[15px] font-bold transition-all bg-[#1D9BF0] text-white hover:bg-[#1A8CD8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Replying…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  )
}
