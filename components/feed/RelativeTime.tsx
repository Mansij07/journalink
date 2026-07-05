"use client"

import * as React from "react"

import { formatRelativeTime } from "./utils"

/**
 * Renders a relative timestamp (e.g. "12s", "3h"). The value is derived from the
 * current time, so it legitimately differs between the server render and client
 * hydration (e.g. "12s" vs "11s") — `suppressHydrationWarning` silences that
 * expected mismatch. An effect recomputes it on mount and ticks it every minute
 * so it stays roughly in sync with the client clock.
 */
export function RelativeTime({
  dateString,
  className,
}: {
  dateString: string
  className?: string
}) {
  const [text, setText] = React.useState(() => formatRelativeTime(dateString))

  React.useEffect(() => {
    setText(formatRelativeTime(dateString))
    const id = setInterval(() => setText(formatRelativeTime(dateString)), 60_000)
    return () => clearInterval(id)
  }, [dateString])

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  )
}
