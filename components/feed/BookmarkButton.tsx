"use client"

import { useState, useEffect } from "react"
import { Bookmark } from "lucide-react"
import { motion } from "framer-motion"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BookmarkButtonProps {
  postId: string
  userId: string
}

export function BookmarkButton({ postId, userId }: BookmarkButtonProps) {
  const [supabase] = useState(() => createClient())
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false
    const fetch = async () => {
      const { data } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle()
      if (!cancelled) {
        setSaved(!!data)
        setLoaded(true)
      }
    }
    fetch()
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
    if (was) {
      await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", userId)
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: userId })
    }
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
        <Bookmark className={cn("size-[18px]", saved && "fill-foreground")} />
      </motion.button>
    </Button>
  )
}
