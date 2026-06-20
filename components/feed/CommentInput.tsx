"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
    <div className="flex gap-3 px-4 py-4 border-b border-white/10">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white">
        U
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <Textarea
          placeholder="Post your reply"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] border-none bg-transparent resize-none p-0 focus-visible:ring-0 text-sm text-[var(--foreground)]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!content.trim() || loading}
            size="sm"
          >
            {loading ? "Replying..." : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
