"use client"

import * as React from "react"
import { gsap, prefersReducedMotion } from "@/lib/gsap"

/**
 * Staggered entrance for the direct children of a container (card grids, lists).
 * Re-runs whenever `dep` changes (e.g. after data loads). Honors reduced-motion.
 */
export function useStaggerReveal<T extends HTMLElement>(dep?: unknown) {
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    if (children.length === 0) return

    if (prefersReducedMotion()) {
      gsap.set(children, { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out",
          stagger: 0.05,
        }
      )
    }, el)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])

  return ref
}

/** Single fade-up reveal for a section / hero / detail header. */
export function useFadeUp<T extends HTMLElement>(dep?: unknown) {
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
      )
    }, el)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])

  return ref
}

/**
 * Mount transition for a route's top-level wrapper. Use on a `"use client"`
 * page shell so navigation feels continuous. Keyed by pathname by the caller.
 */
export function usePageTransition<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      )
    }, el)

    return () => ctx.revert()
  }, [])

  return ref
}

/** Animate a single newly-inserted list item (optimistic UI, realtime rows). */
export function animateInsert(el: HTMLElement | null) {
  if (!el) return
  if (prefersReducedMotion()) {
    gsap.set(el, { opacity: 1, height: "auto" })
    return
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: -8 },
    { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
  )
}
