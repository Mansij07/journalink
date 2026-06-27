"use client"

import Link from "next/link"
import { Edit2 } from "lucide-react"
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
    /*
     * No top padding — the profile card's top border aligns with pt-6 of
     * the page container, which is the same Y as the composer card top.
     * gap-5 (20 px) between profile card and Edit Profile button.
     */
    <div className="w-full flex flex-col gap-5 pb-8">

      {/* Profile card — same tokens as all feed cards */}
      <div className="w-full rounded-2xl border border-[#2F3336] bg-[#16181C] p-6 flex flex-col items-center text-center gap-4">

        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-[#2F3336] ring-offset-2 ring-offset-[#16181C]"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#1D9BF0]/15 flex items-center justify-center text-[28px] font-bold text-[#1D9BF0] select-none ring-2 ring-[#2F3336] ring-offset-2 ring-offset-[#16181C]">
            {initial}
          </div>
        )}

        {/* Name + handle */}
        <div className="space-y-1">
          <p className="font-bold text-[18px] text-white leading-tight break-words">{fullName}</p>
          <p className="text-[13px] text-[#71767B]">@{username}</p>
        </div>

        {/* Role badge */}
        <span
          className={cn(
            "inline-block text-[12px] px-3 py-1 rounded-full font-semibold",
            role === "Prof"
              ? "bg-[#1D9BF0]/15 text-[#1D9BF0]"
              : "bg-white/[0.08] text-[#71767B]"
          )}
        >
          {role === "Prof" ? "Professor" : "Student"}
        </span>

        {/* Bio */}
        {bio && (
          <p className="text-[13px] text-[#71767B] leading-relaxed">{bio}</p>
        )}

        {/* Divider */}
        <div className="w-full h-px bg-[#2F3336]" />

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-[17px] text-white leading-none">{followingCount}</span>
            <span className="text-[12px] text-[#71767B]">Following</span>
          </div>

          <div className="w-px h-7 bg-[#2F3336]" />

          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-[17px] text-white leading-none">{followersCount}</span>
            <span className="text-[12px] text-[#71767B]">Followers</span>
          </div>

          {projectsCount > 0 && (
            <>
              <div className="w-px h-7 bg-[#2F3336]" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-bold text-[17px] text-white leading-none">{projectsCount}</span>
                <span className="text-[12px] text-[#71767B]">Projects</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Profile — same border radius as cards */}
      <Link
        href="/onboarding"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border border-[#2F3336] bg-transparent hover:bg-white/[0.06] transition-colors text-[14px] font-bold text-white"
      >
        <Edit2 className="size-4" />
        Edit Profile
      </Link>

    </div>
  )
}
