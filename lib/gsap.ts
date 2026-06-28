import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register plugins exactly once, client-side only.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/** True when the user has asked the OS to reduce motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export { gsap, ScrollTrigger }
