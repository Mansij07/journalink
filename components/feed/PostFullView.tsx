"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PostCard } from "./PostCard"
import { CommentInput } from "./CommentInput"
import { CommentCard } from "./CommentCard"
import { ArrowLeft } from "lucide-react"

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

    // Fetch post
    const { data: postData } = await supabase
      .from('post')
      .select('*, profiles!author_id(username, role)')
      .eq('id', postId)
      .single()
      
    if (postData) {
      setPost(postData)
    }

    // Fetch comments
    const { data: commentsData, error: commError } = await supabase
      .from('comments')
      .select('*, profiles(username, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (commError) {
      setCommentsError(true)
    } else if (commentsData) {
      setComments(commentsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchPostAndComments()
  }, [postId])

  if (loading) {
    return <div className="text-white/30 text-sm text-center py-8">Loading...</div>
  }

  if (!post) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-6 px-4 py-3 border-b border-white/10 sticky top-0 bg-[var(--background)]/80 backdrop-blur-md z-10">
          <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="font-semibold text-lg">Post</h2>
        </div>
        <div className="text-white/30 text-sm text-center py-8">Post not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-20">
      <div className="flex items-center gap-6 px-4 py-3 border-b border-white/10 sticky top-0 bg-[var(--background)]/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="font-semibold text-lg">Post</h2>
      </div>

      <PostCard post={post} isFullView />

      <div className="border-b border-white/10">
        <div className="px-4 py-3 font-semibold text-white/80">Replies</div>
        <CommentInput postId={postId} userId={userId} onCommentAdded={fetchPostAndComments} />
      </div>

      <div>
        {commentsError ? (
          <p className="text-white/30 text-sm text-center py-8">Replies unavailable.</p>
        ) : comments.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No replies yet. Be the first!</p>
        ) : (
          comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  )
}
