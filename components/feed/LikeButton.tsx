"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  postId: string
  userId: string
  initialCount?: number
}

export function LikeButton({ postId, userId, initialCount = 0 }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false

    const load = async () => {
      const res = await fetch(`/api/posts/${postId}/likes`)
      if (res.ok && !cancelled) {
        const { count: total, liked: userLike } = await res.json()
        setCount(total ?? initialCount)
        setLiked(!!userLike)
        setLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [postId, userId])

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!loaded) return

    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount((prev) => (wasLiked ? prev - 1 : prev + 1))

    try {
      const res = await fetch(`/api/posts/${postId}/likes`, {
        method: wasLiked ? "DELETE" : "POST",
      })
      if (!res.ok) throw new Error()
    } catch {
      // Reconcile: roll back to the pre-click state and tell the user.
      setLiked(wasLiked)
      setCount(prevCount)
      toast.error(wasLiked ? "Couldn't remove like" : "Couldn't like post")
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
          ? "text-red-600 dark:text-red-600"
          : "text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-muted dark:hover:text-foreground"
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={toggleLike}>
        <Heart
          className={cn(
            "size-[20px]",
            liked && "fill-red-600 dark:fill-red-600"
          )}
        />
        {count > 0 && <span className="text-[13px] ml-1 text-muted-foreground">{count}</span>}
      </motion.button>
    </Button>
  )
}
