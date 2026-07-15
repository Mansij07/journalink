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
  // `text` is derived straight from `dateString` + the current time at render
  // — no state needed to keep them in sync. The interval just forces a
  // re-render every minute so the derived value gets recomputed; it never
  // calls a setter that holds the value itself.
  const [, forceTick] = React.useReducer((c: number) => c + 1, 0)

  React.useEffect(() => {
    const id = setInterval(forceTick, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className} suppressHydrationWarning>
      {formatRelativeTime(dateString)}
    </span>
  )
}
