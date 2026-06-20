"use client"

import { Separator } from "@/components/ui/separator"
import { MessageCircle } from "lucide-react"
import { LikeButton } from "./LikeButton"
import { formatRelativeTime } from "./utils"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: any
  onPostClick?: (id: string) => void
  isFullView?: boolean
}

export function PostCard({ post, onPostClick, isFullView = false }: PostCardProps) {
  const authorName = post.profiles?.username || "Unknown"
  const authorRole = post.profiles?.role || "Student"
  const initial = authorName.charAt(0).toUpperCase()
  
  const handleClick = () => {
    if (onPostClick) {
      onPostClick(post.id)
    }
  }

  return (
    <div 
      className={cn(
        "flex flex-col pt-3 transition-colors",
        onPostClick && "hover:bg-white/[0.02] cursor-pointer"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3 px-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white">
          {initial}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-[var(--foreground)] truncate">
              {authorName}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">
              {authorRole}
            </span>
            <span className="text-xs text-white/40 whitespace-nowrap">
              · {formatRelativeTime(post.created_at || new Date().toISOString())}
            </span>
          </div>
          
          <p className={cn(
            "text-white/80 leading-relaxed whitespace-pre-wrap break-words",
            isFullView ? "text-base" : "text-sm"
          )}>
            {post.content}
          </p>
          
          <div className="flex items-center gap-6 mt-3">
            <LikeButton initialCount={post.likeCount || 0} />
            <div className="flex items-center gap-1.5 text-sm text-white/30">
              <MessageCircle className="size-4" />
            </div>
          </div>
        </div>
      </div>
      <Separator />
    </div>
  )
}
