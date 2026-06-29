"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

interface CommentButtonProps {
  postId: string
  initialCount?: number
  onClick?: () => void
}

export function CommentButton({ postId, initialCount = 0, onClick }: CommentButtonProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (!postId) return
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/posts/${postId}/comments?countOnly=1`)
      if (res.ok && !cancelled) {
        const { count: total } = await res.json()
        setCount(total ?? initialCount)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="rounded-full text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-muted dark:hover:text-foreground"
      aria-label="Reply"
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        <MessageCircle className="size-[18px]" />
        {count > 0 && <span className="ml-1 text-[13px]">{count}</span>}
      </motion.button>
    </Button>
  )
}
