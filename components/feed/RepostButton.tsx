"use client"

import { useState, useEffect } from "react"
import { Repeat2 } from "lucide-react"
import { motion } from "framer-motion"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RepostButtonProps {
  postId: string
  userId: string
  initialCount?: number
}

export function RepostButton({ postId, userId, initialCount = 0 }: RepostButtonProps) {
  const [supabase] = useState(() => createClient())
  const [reposted, setReposted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!postId || !userId) return
    let cancelled = false
    const fetch = async () => {
      const [{ count: total }, { data: mine }] = await Promise.all([
        supabase
          .from("post_reposts")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("post_reposts")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle(),
      ])
      if (!cancelled) {
        setCount(total ?? initialCount)
        setReposted(!!mine)
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
    const was = reposted
    setReposted(!was)
    setCount((c) => (was ? c - 1 : c + 1))
    if (was) {
      await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", userId)
    } else {
      await supabase.from("post_reposts").insert({ post_id: postId, user_id: userId })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn(
        "rounded-full transition-colors",
        // Light mode: green accent. Dark mode stays monochrome.
        reposted
          ? "text-emerald-600 dark:text-foreground"
          : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:bg-muted dark:hover:text-foreground"
      )}
      aria-label={reposted ? "Undo repost" : "Repost"}
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={toggle}>
        <Repeat2 className="size-[18px]" />
        {count > 0 && <span className="ml-1 text-[13px]">{count}</span>}
      </motion.button>
    </Button>
  )
}
