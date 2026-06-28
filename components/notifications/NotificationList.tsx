"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Heart, UserPlus, MessageCircle, FileText, Check, X, AtSign } from "lucide-react"

import type { NotificationType } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { formatRelativeTime } from "@/components/feed/utils"

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

const SELECT =
  "id, type, read, created_at, post_id, project_id, application_id, actor:profiles!actor_id ( id, username, full_name, avatar_url )"

function describe(type: NotificationType): string {
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

function iconFor(type: NotificationType) {
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

function hrefFor(n: NotificationItem): string {
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

export function NotificationList({
  initial,
  userId,
}: {
  initial: NotificationItem[]
  userId: string
}) {
  const [supabase] = React.useState(() => createClient())
  const [items, setItems] = React.useState<NotificationItem[]>(initial)

  const refetch = React.useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select(SELECT)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setItems(data as unknown as NotificationItem[])
  }, [supabase, userId])

  // Realtime: any change to this user's notifications refreshes the list.
  React.useEffect(() => {
    const channel = supabase
      .channel(`notif-list-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => refetch()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, refetch])

  const unreadCount = items.filter((i) => !i.read).length

  const markAllRead = async () => {
    setItems((list) => list.map((i) => ({ ...i, read: true })))
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false)
  }

  const markRead = async (id: string) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true } : i)))
    await supabase.from("notifications").update({ read: true }).eq("id", id)
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              When people interact with you or your projects, you&apos;ll see it here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          Mark all read
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {items.map((n, idx) => {
          const Icon = iconFor(n.type)
          const actorName = n.actor?.full_name || n.actor?.username || "Someone"
          return (
            <Link
              key={n.id}
              href={hrefFor(n)}
              onClick={() => !n.read && markRead(n.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60",
                idx > 0 && "border-t border-border",
                !n.read && "bg-muted/60"
              )}
            >
              <div className="relative">
                <Avatar size="sm">
                  {n.actor?.avatar_url && <AvatarImage src={n.actor.avatar_url} alt="" />}
                  <AvatarFallback>{actorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-background text-foreground">
                  <Icon className="size-2.5" />
                </span>
              </div>

              <p className="min-w-0 flex-1 text-sm text-foreground">
                <span className="font-medium">{actorName}</span>{" "}
                <span className="text-muted-foreground">{describe(n.type)}</span>
              </p>

              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(n.created_at)}
              </span>
              {!n.read && <span className="size-2 shrink-0 rounded-full bg-foreground" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
