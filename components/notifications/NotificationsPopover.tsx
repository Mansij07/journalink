"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationRow, type NotificationItem } from "@/components/notifications/shared"

/** How many notifications to load per page (initial load and each "See more"). */
const PAGE_SIZE = 10

export function NotificationsPopover({
  trigger,
}: {
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [hasMore, setHasMore] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadedOnce, setLoadedOnce] = React.useState(false)

  const loadPage = React.useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`
      )
      if (!res.ok) return
      const { notifications } = await res.json()
      const page = notifications as NotificationItem[]
      setItems((prev) => (offset === 0 ? page : [...prev, ...page]))
      setHasMore(page.length === PAGE_SIZE)
    } finally {
      setLoading(false)
      setLoadedOnce(true)
    }
  }, [])

  // Load the first page the first time the popover opens.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && !loadedOnce) loadPage(0)
  }

  const markRead = async (id: string) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true } : i)))
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
  }

  const markAllRead = async () => {
    setItems((list) => list.map((i) => ({ ...i, read: true })))
    await fetch("/api/notifications", { method: "PATCH" })
  }

  const unreadCount = items.filter((i) => !i.read).length

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {open &&
        createPortal(
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-in fade-in-0"
          />,
          document.body
        )}
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="dark w-80 bg-black p-0 data-open:zoom-in-0!"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-md font-semibold text-foreground">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>

        <div className="border-t border-border">
          {loadedOnce && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Bell className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="divide-y divide-border">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    onMarkRead={markRead}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={loading}
                    onClick={() => loadPage(items.length)}
                  >
                    {loading ? "Loading…" : "See more"}
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
