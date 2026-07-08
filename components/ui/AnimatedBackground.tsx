"use client"
import { memo, useEffect, useState } from "react"
import FaultyTerminal from "@/components/ui/FaultyTerminal"

const AnimatedBackground = memo(function AnimatedBackground() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return (
    <div className="absolute inset-0 z-0">
      {/* @ts-expect-error FaultyTerminal is untyped (className/style are optional in practice) */}
      <FaultyTerminal
        tint="#055C3F"
        brightness={0.6}
        scale={isMobile ? 1.0 : 1.5}
        curvature={isMobile ? 0 : 0.07}
        mouseReact={true}
      />
    </div>
  )
})

export default AnimatedBackground
