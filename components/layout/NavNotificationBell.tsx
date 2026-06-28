"use client"

import * as React from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface NavNotificationBellProps {
  userId: string
  active?: boolean
}

export function NavNotificationBell({ userId, active }: NavNotificationBellProps) {
  const [supabase] = React.useState(() => createClient())
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!userId) return
    let cancelled = false

    const loadCount = async () => {
      const { count: unread, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("read", false)
      // Table may not exist yet (managed in the Supabase dashboard); fail soft.
      if (!cancelled && !error) setCount(unread ?? 0)
    }

    loadCount()

    const channel = supabase
      .channel(`notif-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => loadCount()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

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
