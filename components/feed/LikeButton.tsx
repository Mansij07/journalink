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
    e.stopPropagation()
    setCount((prev) => liked ? prev - 1 : prev + 1)
    setLiked(!liked)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={toggleLike}
      className={cn(
        "group flex items-center gap-1 cursor-pointer transition-colors",
        liked ? "text-[#F91880]" : "text-[#71767B]"
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <div className="p-2 rounded-full group-hover:bg-[#F91880]/10 transition-colors">
        <Heart
          className={cn(
            "size-[18px] transition-colors group-hover:text-[#F91880]",
            liked && "fill-[#F91880] text-[#F91880]"
          )}
        />
      </div>
      {count > 0 && (
        <span
          className={cn(
            "text-[13px] transition-colors group-hover:text-[#F91880]",
            liked && "text-[#F91880]"
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  )
}
