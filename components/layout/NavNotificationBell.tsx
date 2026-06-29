"use client"

import * as React from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"

/** How often to refresh the unread badge (ms). */
const POLL_INTERVAL = 30_000

interface NavNotificationBellProps {
  userId: string
  active?: boolean
}

export function NavNotificationBell({ userId, active }: NavNotificationBellProps) {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!userId) return
    let cancelled = false

    const loadCount = async () => {
      const res = await fetch("/api/notifications/unread-count")
      // Endpoint/table may be unavailable; fail soft.
      if (!cancelled && res.ok) {
        const { count: unread } = await res.json()
        setCount(unread ?? 0)
      }
    }

    loadCount()
    const timer = setInterval(loadCount, POLL_INTERVAL)
    // Refresh when the tab regains focus, so the badge feels current.
    const onFocus = () => loadCount()
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [userId])

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "text-foreground"
      )}
    >
      <Bell className="size-[18px]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
