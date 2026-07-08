"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { NotificationRow, type NotificationItem } from "@/components/notifications/shared"

export type { NotificationItem }

/** How often to refresh the list (ms) — replaces the old realtime subscription. */
const POLL_INTERVAL = 30_000

export function NotificationList({
  initial,
  userId,
}: {
  initial: NotificationItem[]
  userId: string
}) {
  const [items, setItems] = React.useState<NotificationItem[]>(initial)

  const refetch = React.useCallback(async () => {
    const res = await fetch("/api/notifications")
    if (res.ok) {
      const { notifications } = await res.json()
      setItems(notifications as NotificationItem[])
    }
  }, [])

  // Poll for updates (replaces the old realtime subscription) + on focus.
  React.useEffect(() => {
    const timer = setInterval(refetch, POLL_INTERVAL)
    const onFocus = () => refetch()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [refetch])

  const unreadCount = items.filter((i) => !i.read).length

  const markAllRead = async () => {
    setItems((list) => list.map((i) => ({ ...i, read: true })))
    await fetch("/api/notifications", { method: "PATCH" })
  }

  const markRead = async (id: string) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true } : i)))
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
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
        {items.map((n, idx) => (
          <NotificationRow
            key={n.id}
            item={n}
            onMarkRead={markRead}
            className={idx > 0 ? "border-t border-border" : undefined}
          />
        ))}
      </div>
    </div>
  )
}
