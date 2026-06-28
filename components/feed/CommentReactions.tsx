"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { motion } from "framer-motion"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Reaction = "like" | "dislike" | null

interface CommentReactionsProps {
  commentId: string
  userId: string
}

export function CommentReactions({ commentId, userId }: CommentReactionsProps) {
  const [supabase] = useState(() => createClient())
  const [mine, setMine] = useState<Reaction>(null)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!commentId || !userId) return
    let cancelled = false
    const fetch = async () => {
      const [{ count: likeCount }, { count: dislikeCount }, { data: my }] = await Promise.all([
        supabase
          .from("comment_reactions")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", commentId)
          .eq("value", "like"),
        supabase
          .from("comment_reactions")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", commentId)
          .eq("value", "dislike"),
        supabase
          .from("comment_reactions")
          .select("value")
          .eq("comment_id", commentId)
          .eq("user_id", userId)
          .maybeSingle(),
      ])
      if (cancelled) return
      setLikes(likeCount ?? 0)
      setDislikes(dislikeCount ?? 0)
      setMine((my?.value as Reaction) ?? null)
      setLoaded(true)
    }
    fetch()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId, userId])

  const react = async (value: "like" | "dislike") => {
    if (!loaded) return
    const prev = mine

    if (prev === value) {
      // toggling off
      setMine(null)
      if (value === "like") setLikes((c) => c - 1)
      else setDislikes((c) => c - 1)
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId)
      return
    }

    // switching or first-time
    setMine(value)
    if (value === "like") {
      setLikes((c) => c + 1)
      if (prev === "dislike") setDislikes((c) => c - 1)
    } else {
      setDislikes((c) => c + 1)
      if (prev === "like") setLikes((c) => c - 1)
    }
    await supabase
      .from("comment_reactions")
      .upsert(
        { comment_id: commentId, user_id: userId, value },
        { onConflict: "comment_id,user_id" }
      )
  }

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => react("like")}
        aria-label={mine === "like" ? "Remove like" : "Like"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] transition-colors",
          mine === "like"
            ? "text-blue-600 dark:text-foreground"
            : "text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-muted dark:hover:text-foreground"
        )}
      >
        <ThumbsUp className={cn("size-4", mine === "like" && "fill-blue-600 dark:fill-foreground")} />
        {likes > 0 && <span>{likes}</span>}
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => react("dislike")}
        aria-label={mine === "dislike" ? "Remove dislike" : "Dislike"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] transition-colors",
          mine === "dislike"
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ThumbsDown className={cn("size-4", mine === "dislike" && "fill-foreground")} />
        {dislikes > 0 && <span>{dislikes}</span>}
      </motion.button>
    </div>
  )
}
