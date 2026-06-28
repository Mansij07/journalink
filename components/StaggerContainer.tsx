"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useStaggerReveal } from "@/lib/animations"

/**
 * Wraps a list/grid so its direct children animate in with a GSAP stagger.
 * Re-runs when `revealKey` changes (e.g. item count after data loads).
 */
export function StaggerContainer({
  children,
  className,
  revealKey,
}: {
  children: React.ReactNode
  className?: string
  revealKey?: unknown
}) {
  const ref = useStaggerReveal<HTMLDivElement>(revealKey)
  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  )
}
