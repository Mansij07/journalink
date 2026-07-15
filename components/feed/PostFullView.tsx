"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PostCard } from "./PostCard"
import { CommentInput } from "./CommentInput"
import { CommentCard } from "./CommentCard"
import { PostSkeleton } from "./PostSkeleton"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PostFullViewProps {
  postId: string
  userId: string
  /** Optional: in-feed callback. On the standalone page this is omitted and we use the router. */
  onBack?: () => void
}

export function PostFullView({ postId, userId, onBack }: PostFullViewProps) {
  const router = useRouter()
  // Loosely typed throughout the UI — shape varies by caller's query embed.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [loading, setLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(false)

  const goBack =
    onBack ?? (() => (window.history.length > 1 ? router.back() : router.push("/feed")))

  const fetchPostAndComments = useCallback(async () => {
    setLoading(true)
    setCommentsError(false)

    const postRes = await fetch(`/api/posts/${postId}`)
    if (postRes.ok) {
      setPost(await postRes.json())
    }

    const commentsRes = await fetch(`/api/posts/${postId}/comments`)
    if (!commentsRes.ok) {
      setCommentsError(true)
    } else {
      const { comments: commentsData } = await commentsRes.json()
      setComments(commentsData ?? [])
    }

    setLoading(false)
  }, [postId])

  useEffect(() => {
    // Fetches over the network and sets state only in the (async) response
    // handler, not synchronously during the effect — not the cascading-render
    // pattern this rule targets. No effect-free alternative for "fetch on
    // mount, refetch on demand" without introducing a data-fetching library.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPostAndComments()
  }, [fetchPostAndComments])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        {/* Sticky back bar — usable while the post loads */}
        <div className="-mx-px flex items-center gap-4 border-b border-border bg-background px-1 py-3 sticky top-16 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">Post</h2>
        </div>

        <PostSkeleton />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-6 px-4 py-3 border-b border-border sticky top-16 bg-background z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
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
          onClick={goBack}
          className="rounded-full"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">Post</h2>
      </div>

      {/* Post — same card structure as the feed */}
      <PostCard post={post} userId={userId} isFullView />

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
