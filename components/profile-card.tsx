"use client"

import { useState } from "react"
import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ProfileCardData {
  id: string
  username: string
  role: string
  full_name: string | null
  avatar_url: string | null
}

interface ProfileCardProps {
  profile: ProfileCardData
  followsYou?: boolean
  followed: boolean
  onToggleFollow: () => void | Promise<void>
}

export function ProfileCard({ profile, followsYou = false, followed, onToggleFollow }: ProfileCardProps) {
  const [pending, setPending] = useState(false)

  const displayName = profile.full_name || profile.username
  const initial = displayName.charAt(0).toUpperCase()

  const handleClick = async () => {
    setPending(true)
    await onToggleFollow()
    setPending(false)
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <Link
        href={`/profiles/${profile.username}`}
        className="group flex items-center gap-2.5 min-w-0"
      >
        <Avatar size="default">
          {profile.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={profile.username} className="object-cover" />
          )}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-md font-semibold text-foreground truncate leading-tight group-hover:underline">
              {displayName}
            </p>
            {profile.role === "Prof" && (
              <BadgeCheck className="size-[14px] text-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
          {followsYou && !followed && (
            <Badge variant="secondary" className="text-[14px] px-0 font-normal border-0 bg-transparent">
              Follows you
            </Badge>
          )}
        </div>
      </Link>

      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "shrink-0 h-7 px-3 rounded-full text-[14px] font-bold whitespace-nowrap",
          followed
            ? "bg-muted text-muted-foreground border-border hover:bg-muted hover:text-muted-foreground"
            : followsYou
            ? "bg-secondary text-foreground border-border hover:bg-muted hover:text-foreground"
            : ""
        )}
      >
        {followed ? "Following" : followsYou ? "Follow Back" : "Follow"}
      </Button>
    </div>
  )
}
