"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"

const GAP = 6 // gap-1.5 between badges, in px
const PLUS_RESERVE = 44 // approx width to keep for the "+n" badge

// ▼ Change skill badge SIZE here (applies to every skill badge + the "+n").
//   e.g. bigger: "h-6 px-2.5 text-sm"  ·  smaller: "h-5 px-2 text-xs" (default)
//   If you make them noticeably bigger, bump PLUS_RESERVE above to match.
const SKILL_BADGE_SIZE = "h-6 px-3 text-xs"

/**
 * Renders skill badges shortest-first and shows as many as actually fit on one
 * row, rolling the remainder into a "+n" badge. Widths are measured on the
 * client (with a hidden reference row) so the count adapts to the real card
 * width rather than a character-count guess.
 */
export function SkillsRow({ skills }: { skills: string[] }) {
  const sorted = React.useMemo(
    () => [...skills].sort((a, b) => a.length - b.length),
    [skills]
  )

  const containerRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLDivElement>(null)
  const [count, setCount] = React.useState(sorted.length)

  React.useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const recompute = () => {
      const avail = container.clientWidth
      const badges = Array.from(measure.children) as HTMLElement[]
      let used = 0
      let fit = 0
      for (let i = 0; i < badges.length; i++) {
        const next = used + (i > 0 ? GAP : 0) + badges[i].offsetWidth
        const moreAfter = i < badges.length - 1
        if (next + (moreAfter ? GAP + PLUS_RESERVE : 0) > avail) break
        used = next
        fit = i + 1
      }
      setCount(Math.max(1, fit))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [sorted])

  if (sorted.length === 0) return null

  const shown = sorted.slice(0, count)
  const hidden = sorted.length - shown.length

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 overflow-hidden">
      {/* Hidden reference row: all badges at natural width, used for measuring. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-1.5"
      >
        {sorted.map((skill) => (
          <Badge
            key={skill}
            variant="secondary"
            className={`shrink-0 font-normal ${SKILL_BADGE_SIZE}`}
          >
            {skill}
          </Badge>
        ))}
      </div>

      {shown.map((skill) => (
        <Badge
          key={skill}
          variant="secondary"
          className={`min-w-0 shrink-0 truncate font-normal ${SKILL_BADGE_SIZE}`}
        >
          {skill}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge
          variant="secondary"
          className={`shrink-0 font-normal ${SKILL_BADGE_SIZE}`}
        >
          +{hidden}
        </Badge>
      )}
    </div>
  )
}
