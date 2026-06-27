"use client"

import { formatRelativeTime } from "./utils"

interface CommentCardProps {
  comment: any
}

export function CommentCard({ comment }: CommentCardProps) {
  const authorName = comment.profiles?.username || "Unknown"
  const authorRole = comment.profiles?.role || "Student"
  const initial = authorName.charAt(0).toUpperCase()
  
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[#2F3336]">
      <div className="w-10 h-10 rounded-full bg-[#2F3336] flex items-center justify-center shrink-0 text-sm font-bold text-white">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="font-bold text-[15px] text-white truncate">{authorName}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/8 text-[#71767B] shrink-0">
            {authorRole === "Prof" ? "Prof" : "Student"}
          </span>
          <span className="text-[#71767B] shrink-0">·</span>
          <span className="text-[15px] text-[#71767B] whitespace-nowrap">
            {formatRelativeTime(comment.created_at || new Date().toISOString())}
          </span>
        </div>
        <p className="text-[15px] text-white leading-normal whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  )
}
