"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  initialCount?: number
}

export function LikeButton({ initialCount = 0 }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent clicking the post card
    if (liked) {
      setCount(prev => prev - 1)
    } else {
      setCount(prev => prev + 1)
    }
    setLiked(!liked)
  }

  return (
    <motion.button
      whileTap={{ scale: 1.3 }}
      onClick={toggleLike}
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors cursor-pointer",
        liked ? "text-red-500" : "text-white/40 hover:text-red-400"
      )}
    >
      <Heart className={cn("size-4", liked && "fill-red-500")} />
      {count > 0 && <span>{count}</span>}
    </motion.button>
  )
}
