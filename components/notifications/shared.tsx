"use client"

import * as React from "react"
import Link from "next/link"
import { Heart, UserPlus, MessageCircle, FileText, Check, X, AtSign } from "lucide-react"

import type { NotificationType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RelativeTime } from "@/components/feed/RelativeTime"

interface Actor {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

export interface NotificationItem {
  id: string
  type: NotificationType
  read: boolean
  created_at: string
  post_id: number | null
  project_id: number | null
  application_id: string | null
  actor: Actor | null
}

export function describe(type: NotificationType): string {
  switch (type) {
    case "like":
      return "liked your post"
    case "follow":
      return "started following you"
    case "comment":
      return "commented on your post"
    case "application_new":
      return "applied to your project"
    case "application_accepted":
      return "accepted your application"
    case "application_rejected":
      return "declined your application"
    case "mention":
      return "mentioned you"
  }
}

export function iconFor(type: NotificationType) {
  switch (type) {
    case "like":
      return Heart
    case "follow":
      return UserPlus
    case "comment":
      return MessageCircle
    case "application_accepted":
      return Check
    case "application_rejected":
      return X
    case "mention":
      return AtSign
    default:
      return FileText
  }
}

export function hrefFor(n: NotificationItem): string {
  switch (n.type) {
    case "follow":
      return n.actor?.username ? `/profiles/${n.actor.username}` : "/notifications"
    case "application_new":
    case "application_accepted":
    case "application_rejected":
      return n.project_id ? `/projects/${n.project_id}` : "/applications"
    default:
      return "/feed"
  }
}

export function NotificationRow({
  item,
  onMarkRead,
  onNavigate,
  className,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => void
  onNavigate?: () => void
  className?: string
}) {
  const actorName = item.actor?.full_name || item.actor?.username || "Someone"

  return (
    <Link
      href={hrefFor(item)}
      onClick={() => {
        if (!item.read) onMarkRead(item.id)
        onNavigate?.()
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60",
        !item.read && "bg-muted/60",
        className
      )}
    >
      <div className="relative">
        <Avatar size="sm">
          {item.actor?.avatar_url && <AvatarImage src={item.actor.avatar_url} alt="" />}
          <AvatarFallback>{actorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-background text-foreground">
          {React.createElement(iconFor(item.type), { className: "size-2.5" })}
        </span>
      </div>

      <p className="min-w-0 flex-1 text-md text-foreground">
        <span className="font-medium">{actorName}</span>{" "}
        <span className="text-muted-foreground">{describe(item.type)}</span>
      </p>

      <RelativeTime
        dateString={item.created_at}
        className="shrink-0 text-sm text-muted-foreground"
      />
      {!item.read && <span className="size-2 shrink-0 rounded-full bg-foreground" />}
    </Link>
  )
}
