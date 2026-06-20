"use client"

import { Separator } from "@/components/ui/separator"
import { formatRelativeTime } from "./utils"

interface CommentCardProps {
  comment: any
}

export function CommentCard({ comment }: CommentCardProps) {
  const authorName = comment.profiles?.username || "Unknown"
  const authorRole = comment.profiles?.role || "Student"
  const initial = authorName.charAt(0).toUpperCase()
  
  return (
    <div className="flex flex-col pt-3">
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
              · {formatRelativeTime(comment.created_at || new Date().toISOString())}
            </span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>
      </div>
      <Separator />
    </div>
  )
}
