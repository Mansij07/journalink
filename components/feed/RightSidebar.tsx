"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { BadgeCheck } from "lucide-react"
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

export function RightSidebar({ suggestions, currentUserId, followsYouIds }: RightSidebarProps) {
  const [supabase] = useState(() => createClient())
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const followsYouSet = new Set(followsYouIds)

  const handleFollow = async (targetId: string) => {
    setFollowed((prev) => new Set(prev).add(targetId))
    await supabase
      .from("follows")
      .insert({ follower_id: currentUserId, following_id: targetId })
  }

  if (suggestions.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-4 pb-8">
      <div className="w-full rounded-2xl border border-[#2F3336] bg-[#16181C] p-5">
        <h2 className="font-bold text-[17px] text-white mb-4">Who to Follow</h2>
        <div className="space-y-4">
          {suggestions.map((user) => {
            const isFollowed = followed.has(user.id)
            const followsYou = followsYouSet.has(user.id)
            const displayName = user.full_name || user.username
            const initial = displayName.charAt(0).toUpperCase()

            return (
              <div key={user.id} className="flex items-center justify-between gap-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1D9BF0]/15 flex items-center justify-center text-[13px] font-bold text-[#1D9BF0] shrink-0 select-none">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate leading-tight">
                        {displayName}
                      </p>
                      {user.role === "Prof" && (
                        <BadgeCheck className="size-[14px] text-[#1D9BF0] shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#71767B] truncate">@{user.username}</p>
                    {followsYou && !isFollowed && (
                      <p className="text-[11px] text-[#71767B]">Follows you</p>
                    )}
                  </div>
                </div>

                {/* Follow / Follow Back / Following button */}
                <button
                  onClick={() => !isFollowed && handleFollow(user.id)}
                  disabled={isFollowed}
                  className={cn(
                    "shrink-0 h-7 px-3 rounded-full text-[12px] font-bold transition-colors whitespace-nowrap",
                    isFollowed
                      ? "bg-[#00BA7C]/15 text-[#00BA7C] border border-[#00BA7C]/30 cursor-default"
                      : followsYou
                      ? "bg-[#1D9BF0]/15 text-[#1D9BF0] border border-[#1D9BF0]/30 hover:bg-[#1D9BF0]/25 cursor-pointer"
                      : "border border-[#2F3336] text-white hover:bg-white/[0.06] cursor-pointer"
                  )}
                >
                  {isFollowed ? "Following" : followsYou ? "Follow Back" : "Follow"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
