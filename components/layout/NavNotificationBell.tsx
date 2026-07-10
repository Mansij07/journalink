"use client"

import * as React from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover"
import { useNotificationsRealtime } from "@/components/notifications/useNotificationsRealtime"

/** Fallback poll interval (ms) — realtime pushes handle the common case. */
const POLL_INTERVAL = 60_000

interface NavNotificationBellProps {
  userId: string
  active?: boolean
}

export function NavNotificationBell({ userId, active }: NavNotificationBellProps) {
  const [count, setCount] = React.useState(0)

  const loadCount = React.useCallback(async () => {
    const res = await fetch("/api/notifications/unread-count")
    // Endpoint/table may be unavailable; fail soft.
    if (res.ok) {
      const { count: unread } = await res.json()
      setCount(unread ?? 0)
    }
  }, [])

  React.useEffect(() => {
    if (!userId) return

    loadCount()
    const timer = setInterval(loadCount, POLL_INTERVAL)
    // Refresh when the tab regains focus, so the badge feels current.
    const onFocus = () => loadCount()
    window.addEventListener("focus", onFocus)

    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [userId, loadCount])

  // Push updates: recompute the badge the instant a notification is
  // inserted or marked read. Polling above is just a fallback.
  useNotificationsRealtime(userId, loadCount)

  const triggerClassName = cn(
    "relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    active && "text-foreground"
  )
  const ariaLabel = count > 0 ? `Notifications, ${count} unread` : "Notifications"

  const bellInner = (
    <>
      <Bell className="size-[18px]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </>
  )

  return (
    <>
      {/* Mobile: navigate to the full notifications page. */}
      <Link
        href="/notifications"
        aria-label={ariaLabel}
        className={cn(triggerClassName, "md:hidden")}
      >
        {bellInner}
      </Link>

      {/* Desktop: open a popover just below the bell. */}
      <div className="hidden md:block">
        <NotificationsPopover
          trigger={
            <button type="button" aria-label={ariaLabel} className={triggerClassName}>
              {bellInner}
            </button>
          }
        />
      </div>
    </>
  )
}
