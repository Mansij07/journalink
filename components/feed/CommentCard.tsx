"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "./utils"
import { CommentReactions } from "./CommentReactions"
import { renderWithMentions } from "@/lib/mentions"

interface CommentCardProps {
  comment: any
  userId?: string
}

export function CommentCard({ comment, userId = "" }: CommentCardProps) {
  const authorName = comment.profiles?.username || "Unknown"
  const authorRole = comment.profiles?.role || "Student"
  const avatarUrl = comment.profiles?.avatar_url || null
  const initial = authorName.charAt(0).toUpperCase()

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border">
      <Avatar className="size-10 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={authorName} className="object-cover" />}
        <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="font-bold text-[15px] text-foreground truncate">{authorName}</span>
          <Badge variant="secondary" className="text-[11px] px-1.5 py-0.5 rounded-full font-normal">
            {authorRole === "Prof" ? "Prof" : "Student"}
          </Badge>
          <span className="text-muted-foreground shrink-0">·</span>
          <span className="text-[15px] text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(comment.created_at || new Date().toISOString())}
          </span>
        </div>
        <p className="text-[15px] text-foreground leading-normal whitespace-pre-wrap break-words">
          {renderWithMentions(comment.content)}
        </p>
        {userId && <CommentReactions commentId={comment.id} userId={userId} />}
      </div>
    </div>
  )
}
