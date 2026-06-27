"use client"

import { useState } from "react"
import { MessageCircle, Bookmark, Share2, Repeat2, BarChart2, BadgeCheck } from "lucide-react"
import { LikeButton } from "./LikeButton"
import { MediaViewer, type MediaItem } from "./MediaViewer"
import { MediaCollage } from "./MediaCollage"
import { formatRelativeTime } from "./utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: any
  userId?: string
  onPostClick?: (id: string) => void
  isFullView?: boolean
}

export function PostCard({ post, userId = "", onPostClick, isFullView = false }: PostCardProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const mediaItems: MediaItem[] = Array.isArray(post.media) && post.media.length > 0
    ? post.media
    : [
        ...(post.image_url ? [{ type: "image" as const, url: post.image_url }] : []),
        ...(post.video_url ? [{ type: "video" as const, url: post.video_url }] : []),
      ]

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
    <>
      <article
        className={cn(
          "flex gap-3 transition-colors duration-150",
          isFullView
            ? "px-5 pt-4 pb-3 border-b border-border"
            : "mb-4 p-5 rounded-2xl border border-border bg-card",
          !isFullView && onPostClick && "hover:bg-accent/50 cursor-pointer",
          isFullView && onPostClick && "hover:bg-accent/30 cursor-pointer"
        )}
        onClick={handleClick}
        aria-label={`Post by ${displayName}`}
      >
        <div className="flex-shrink-0 pt-0.5">
          <Avatar className="size-10">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
            )}
            <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0 pb-3">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap min-w-0">
            <span className="font-bold text-[15px] text-foreground truncate max-w-[160px]">
              {displayName}
            </span>
            {authorRole === "Prof" && (
              <BadgeCheck className="size-[15px] text-[#1D9BF0] shrink-0" />
            )}
            <span className="text-[15px] text-muted-foreground shrink-0 hidden sm:inline">
              @{username}
            </span>
            <span className="text-muted-foreground shrink-0">·</span>
            <span className="text-[15px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatRelativeTime(post.created_at || new Date().toISOString())}
            </span>
          </div>

          <p
            className={cn(
              "text-foreground leading-normal whitespace-pre-wrap break-words mb-3",
              isFullView ? "text-[17px]" : "text-[15px]"
            )}
          >
            {post.content}
          </p>

          {mediaItems.length > 0 && (
            <MediaCollage items={mediaItems} onOpen={setViewerIndex} />
          )}

          <div
            className="flex items-center justify-between text-muted-foreground -ml-2 max-w-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0]"
              aria-label="Reply"
            >
              <MessageCircle className="size-[18px]" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRepost}
              className={cn(
                "rounded-full",
                reposted
                  ? "text-[#00BA7C]"
                  : "text-muted-foreground hover:bg-[#00BA7C]/10 hover:text-[#00BA7C]"
              )}
              aria-label={reposted ? "Undo repost" : "Repost"}
            >
              <Repeat2 className="size-[18px]" />
            </Button>

            <LikeButton postId={post.id} userId={userId} initialCount={post.likeCount || 0} />

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0]"
              aria-label="Views"
            >
              <BarChart2 className="size-[18px]" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleBookmark}
              className={cn(
                "rounded-full",
                bookmarked
                  ? "text-[#1D9BF0]"
                  : "text-muted-foreground hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0]"
              )}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark className={cn("size-[18px]", bookmarked && "fill-[#1D9BF0]")} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="rounded-full text-muted-foreground hover:bg-[#1D9BF0]/10 hover:text-[#1D9BF0]"
              aria-label="Share"
            >
              <Share2 className="size-[18px]" />
            </Button>
          </div>
        </div>
      </article>

      <MediaViewer
        items={mediaItems}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
      />
    </>
  )
}
