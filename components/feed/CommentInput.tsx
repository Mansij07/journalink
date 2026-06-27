"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
      .from("comments")
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
    <div className="flex gap-3 px-4 py-4 border-b border-border">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-muted text-foreground text-sm font-bold">U</AvatarFallback>
      </Avatar>

      <div className="flex-1 flex flex-col gap-2">
        <Textarea
          placeholder="Post your reply"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full bg-transparent resize-none text-[15px] placeholder:text-muted-foreground focus-visible:ring-0 leading-relaxed border-none shadow-none p-0"
        />
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="rounded-full"
          >
            {loading ? "Replying…" : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}
