"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  postId: string
  userId: string
  initialCount?: number
}

export function LikeButton({ postId, userId, initialCount = 0 }: LikeButtonProps) {
  const [supabase] = useState(() => createClient())
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false

    const fetch = async () => {
      const [{ count: total }, { data: userLike }] = await Promise.all([
        supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle(),
      ])
      if (!cancelled) {
        setCount(total ?? initialCount)
        setLiked(!!userLike)
        setLoaded(true)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [postId, userId])

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!loaded) return

    const wasLiked = liked
    setLiked(!wasLiked)
    setCount((prev) => (wasLiked ? prev - 1 : prev + 1))

    if (wasLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId)
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: userId })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(
        "rounded-full transition-colors",
        liked
          ? "text-[#F91880]"
          : "text-muted-foreground hover:bg-[#F91880]/10 hover:text-[#F91880]"
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={toggleLike}>
        <Heart className={cn("size-[18px]", liked && "fill-[#F91880]")} />
        {count > 0 && <span className="text-[13px] ml-1">{count}</span>}
      </motion.button>
    </Button>
  )
}
