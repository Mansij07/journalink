"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PostCard } from "./PostCard"
import { CommentInput } from "./CommentInput"
import { CommentCard } from "./CommentCard"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PostFullViewProps {
  postId: string
  userId: string
  role: string
  onBack: () => void
}

export function PostFullView({ postId, userId, role, onBack }: PostFullViewProps) {
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(false)
  const supabase = createClient()

  const fetchPostAndComments = async () => {
    setLoading(true)
    setCommentsError(false)

    const { data: postData } = await supabase
      .from("post")
      .select("*")
      .eq("id", postId)
      .single()

    if (postData) {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", postData.author_id)
        .single()
      setPost({ ...postData, profiles: authorProfile ?? null })
    }

    const { data: commentsData, error: commError } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (commError) {
      setCommentsError(true)
    } else if (commentsData && commentsData.length > 0) {
      const commentAuthorIds = [...new Set(commentsData.map((c) => c.author_id))]
      const { data: commentProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", commentAuthorIds)
      const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p]))
      setComments(commentsData.map((c) => ({ ...c, profiles: profileMap.get(c.author_id) ?? null })))
    } else {
      setComments([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchPostAndComments()
  }, [postId])

  if (loading) {
    return <div className="text-muted-foreground text-[15px] text-center py-8">Loading...</div>
  }

  if (!post) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-6 px-4 py-3 border-b border-border sticky top-16 bg-background z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="font-bold text-[20px] text-foreground">Post</h2>
        </div>
        <div className="text-muted-foreground text-[15px] text-center py-8">Post not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Sticky back bar — sits just under the global nav */}
      <div className="-mx-px flex items-center gap-4 border-b border-border bg-background px-1 py-3 sticky top-16 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">Post</h2>
      </div>

      {/* Post — same card structure as the feed */}
      <PostCard post={post} userId={userId} />

      {/* Replies, grouped in a matching card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-[15px] font-semibold text-foreground">
          Replies
        </div>
        <CommentInput postId={postId} userId={userId} onCommentAdded={fetchPostAndComments} />
        {commentsError ? (
          <p className="py-8 text-center text-[15px] text-muted-foreground">Replies unavailable.</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-muted-foreground">
            No replies yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} userId={userId} />
          ))
        )}
      </div>
    </div>
  )
}
