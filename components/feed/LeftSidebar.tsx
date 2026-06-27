"use client"

import Link from "next/link"
import { Edit2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface LeftSidebarProps {
  profile: any
  followersCount: number
  followingCount: number
  projectsCount: number
}

export function LeftSidebar({ profile, followersCount, followingCount, projectsCount }: LeftSidebarProps) {
  const username = profile?.username || "User"
  const role = profile?.role || "Student"
  const fullName = profile?.full_name || username
  const avatarUrl = profile?.avatar_url || null
  const bio = profile?.bio || null
  const initial = (fullName.charAt(0) || username.charAt(0) || "U").toUpperCase()

  return (
    <div className="w-full flex flex-col gap-5 pb-8">

      <div className="w-full rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-4">

        <Avatar className="size-20 ring-2 ring-border ring-offset-2 ring-offset-card">
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
          )}
          <AvatarFallback className="bg-[#1D9BF0]/15 text-[#1D9BF0] text-[28px] font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[18px] text-foreground leading-tight break-words">{fullName}</p>
          <p className="text-[13px] text-muted-foreground">@{username}</p>
        </div>

        <Badge
          className={cn(
            "rounded-full font-semibold text-[12px] border-0",
            role === "Prof"
              ? "bg-[#1D9BF0]/15 text-[#1D9BF0] hover:bg-[#1D9BF0]/15"
              : "bg-muted text-muted-foreground hover:bg-muted"
          )}
        >
          {role === "Prof" ? "Professor" : "Student"}
        </Badge>

        {bio && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">{bio}</p>
        )}

        <Separator />

        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-[17px] text-foreground leading-none">{followingCount}</span>
            <span className="text-[12px] text-muted-foreground">Following</span>
          </div>

          <Separator orientation="vertical" className="h-7" />

          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-[17px] text-foreground leading-none">{followersCount}</span>
            <span className="text-[12px] text-muted-foreground">Followers</span>
          </div>

          {projectsCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-7" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-bold text-[17px] text-foreground leading-none">{projectsCount}</span>
                <span className="text-[12px] text-muted-foreground">Projects</span>
              </div>
            </>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        asChild
        className="w-full h-12 rounded-2xl font-bold"
      >
        <Link href="/onboarding">
          <Edit2 data-icon="inline-start" />
          Edit Profile
        </Link>
      </Button>

    </div>
  )
}
