"use client"

import { useState } from "react"
import { BadgeCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface RightSidebarProps {
  suggestions: Suggestion[]
  currentUserId: string
  followsYouIds: string[]
}

export function RightSidebar({ suggestions, followsYouIds }: RightSidebarProps) {
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const followsYouSet = new Set(followsYouIds)

  const handleFollow = async (targetId: string) => {
    setFollowed((prev) => new Set(prev).add(targetId))
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    })
  }

  if (suggestions.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-4 pb-8">
      <div className="w-full rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold text-[17px] text-foreground mb-4">Who to Follow</h2>
        <div className="flex flex-col gap-4">
          {suggestions.map((user) => {
            const isFollowed = followed.has(user.id)
            const followsYou = followsYouSet.has(user.id)
            const displayName = user.full_name || user.username
            const initial = displayName.charAt(0).toUpperCase()

            return (
              <div key={user.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-9 shrink-0">
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.username} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-muted text-foreground text-[13px] font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate leading-tight">
                        {displayName}
                      </p>
                      {user.role === "Prof" && (
                        <BadgeCheck className="size-[14px] text-foreground shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">@{user.username}</p>
                    {followsYou && !isFollowed && (
                      <Badge variant="secondary" className="text-[11px] px-0 font-normal border-0 bg-transparent">
                        Follows you
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !isFollowed && handleFollow(user.id)}
                  disabled={isFollowed}
                  className={cn(
                    "shrink-0 h-7 px-3 rounded-full text-[12px] font-bold whitespace-nowrap",
                    isFollowed
                      ? "bg-muted text-muted-foreground border-border hover:bg-muted hover:text-muted-foreground"
                      : followsYou
                      ? "bg-secondary text-foreground border-border hover:bg-muted hover:text-foreground"
                      : ""
                  )}
                >
                  {isFollowed ? "Following" : followsYou ? "Follow Back" : "Follow"}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
