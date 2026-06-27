"use client"

import { useState } from "react"
import { MessageCircle, Bookmark, Share2, Repeat2, BarChart2, BadgeCheck } from "lucide-react"
import { LikeButton } from "./LikeButton"
import { formatRelativeTime } from "./utils"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: any
  onPostClick?: (id: string) => void
  isFullView?: boolean
}

export function PostCard({ post, onPostClick, isFullView = false }: PostCardProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [reposted, setReposted] = useState(false)

  const profile = post.profiles
  const displayName = profile?.full_name || profile?.username || "Unknown"
  const username = profile?.username || "unknown"
  const authorRole = profile?.role || "Student"
  const avatarUrl = profile?.avatar_url || null
  const initial = (displayName.charAt(0) || username.charAt(0) || "U").toUpperCase()

  const handleClick = () => {
    if (onPostClick) onPostClick(post.id)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    setBookmarked((b) => !b)
  }

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation()
    setReposted((r) => !r)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: post.content }).catch(() => null)
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(post.content).catch(() => null)
    }
  }

  return (
    <article
      className={cn(
        "flex gap-3 transition-colors duration-150",
        isFullView
          ? "px-5 pt-4 pb-3 border-b border-[#2F3336]"
          : "mb-4 p-5 rounded-2xl border border-[#2F3336] bg-[#16181C]",
        !isFullView && onPostClick && "hover:bg-[#1c1e20] cursor-pointer",
        isFullView && onPostClick && "hover:bg-white/[0.03] cursor-pointer"
      )}
      onClick={handleClick}
      aria-label={`Post by ${displayName}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2F3336] flex items-center justify-center text-sm font-bold text-white select-none">
            {initial}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex-1 min-w-0 pb-3">
        {/* Author row */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap min-w-0">
          <span className="font-bold text-[15px] text-white truncate max-w-[160px]">
            {displayName}
          </span>
          {authorRole === "Prof" && (
            <BadgeCheck className="size-[15px] text-[#1D9BF0] shrink-0" />
          )}
          <span className="text-[15px] text-[#71767B] shrink-0 hidden sm:inline">
            @{username}
          </span>
          <span className="text-[#71767B] shrink-0">·</span>
          <span className="text-[15px] text-[#71767B] whitespace-nowrap shrink-0">
            {formatRelativeTime(post.created_at || new Date().toISOString())}
          </span>
        </div>

        {/* Post content */}
        <p
          className={cn(
            "text-white leading-normal whitespace-pre-wrap break-words mb-3",
            isFullView ? "text-[17px]" : "text-[15px]"
          )}
        >
          {post.content}
        </p>

        {/* Attached image */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post attachment"
            className="mt-1 mb-3 rounded-xl max-h-80 w-full object-cover border border-[#2F3336]"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Engagement row */}
        <div
          className="flex items-center justify-between text-[#71767B] -ml-2 max-w-[420px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reply */}
          <button
            className="group flex items-center gap-1 cursor-pointer"
            aria-label="Reply"
          >
            <div className="p-2 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
              <MessageCircle className="size-[18px] group-hover:text-[#1D9BF0] transition-colors" />
            </div>
          </button>

          {/* Repost */}
          <button
            onClick={handleRepost}
            className={cn(
              "group flex items-center gap-1 cursor-pointer",
              reposted && "text-[#00BA7C]"
            )}
            aria-label={reposted ? "Undo repost" : "Repost"}
          >
            <div className="p-2 rounded-full group-hover:bg-[#00BA7C]/10 transition-colors">
              <Repeat2
                className={cn(
                  "size-[18px] group-hover:text-[#00BA7C] transition-colors",
                  reposted && "text-[#00BA7C]"
                )}
              />
            </div>
          </button>

          {/* Like */}
          <LikeButton initialCount={post.likeCount || 0} />

          {/* Views */}
          <button
            className="group flex items-center gap-1 cursor-pointer"
            aria-label="Views"
          >
            <div className="p-2 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
              <BarChart2 className="size-[18px] group-hover:text-[#1D9BF0] transition-colors" />
            </div>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className={cn(
              "group flex items-center gap-1 cursor-pointer",
              bookmarked && "text-[#1D9BF0]"
            )}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <div className="p-2 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
              <Bookmark
                className={cn(
                  "size-[18px] group-hover:text-[#1D9BF0] transition-colors",
                  bookmarked && "fill-[#1D9BF0] text-[#1D9BF0]"
                )}
              />
            </div>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="group flex items-center gap-1 cursor-pointer"
            aria-label="Share"
          >
            <div className="p-2 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
              <Share2 className="size-[18px] group-hover:text-[#1D9BF0] transition-colors" />
            </div>
          </button>
        </div>
      </div>
    </article>
  )
}
