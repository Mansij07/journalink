"use client"

import { useState, useEffect } from "react"
import { Repeat2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RepostButtonProps {
  postId: string
  userId: string
  initialCount?: number
}

export function RepostButton({ postId, userId, initialCount = 0 }: RepostButtonProps) {
  const [reposted, setReposted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/posts/${postId}/reposts`)
      if (res.ok && !cancelled) {
        const { count: total, reposted: mine } = await res.json()
        setCount(total ?? initialCount)
        setReposted(!!mine)
        setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, userId])

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!loaded) return
    const was = reposted
    setReposted(!was)
    setCount((c) => (was ? c - 1 : c + 1))
    await fetch(`/api/posts/${postId}/reposts`, { method: was ? "DELETE" : "POST" })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(
        "rounded-full transition-colors",
        reposted
          ? "text-emerald-600 dark:text-emerald-600"
          : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:bg-muted dark:hover:text-foreground"
      )}
      aria-label={reposted ? "Undo repost" : "Repost"}
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={toggle}>
        <Repeat2 className="size-[20px]" />
        {count > 0 && <span className="ml-1 text-[13px] text-muted-foreground">{count}</span>}
      </motion.button>
    </Button>
  )
}
