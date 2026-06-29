"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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
  const [following, setFollowing] = React.useState(initialFollowing)
  const [pending, setPending] = React.useState(false)

  const toggle = async () => {
    setPending(true)
    const next = !following
    setFollowing(next) // optimistic

    const res = await fetch("/api/follows", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    })

    setPending(false)
    if (!res.ok) {
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
