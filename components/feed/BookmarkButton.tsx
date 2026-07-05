"use client"

import { useState, useEffect } from "react"
import { Bookmark } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  postId: string
  userId: string
}

export function BookmarkButton({ postId, userId }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/posts/${postId}/bookmarks`)
      if (res.ok && !cancelled) {
        const { bookmarked } = await res.json()
        setSaved(!!bookmarked)
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
    const was = saved
    setSaved(!was)
    await fetch(`/api/posts/${postId}/bookmarks`, { method: was ? "DELETE" : "POST" })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(
        "rounded-full transition-colors",
        saved
          ? "text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label={saved ? "Remove bookmark" : "Save"}
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={toggle}>
        <Bookmark className={cn("size-[20px]", saved && "fill-foreground")} />
      </motion.button>
    </Button>
  )
}
