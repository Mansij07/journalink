"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface FollowButtonProps {
  targetId: string
  currentUserId: string
  initialFollowing: boolean
}

export function FollowButton({
  targetId,
  currentUserId,
  initialFollowing,
}: FollowButtonProps) {
  const router = useRouter()
  const [supabase] = React.useState(() => createClient())
  const [following, setFollowing] = React.useState(initialFollowing)
  const [pending, setPending] = React.useState(false)

  const toggle = async () => {
    setPending(true)
    const next = !following
    setFollowing(next) // optimistic

    const { error } = next
      ? await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetId })
      : await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetId)

    setPending(false)
    if (error) {
      setFollowing(!next) // revert
      return
    }
    router.refresh()
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={toggle}
      disabled={pending}
    >
      {following ? "Following" : "Follow"}
    </Button>
  )
}
