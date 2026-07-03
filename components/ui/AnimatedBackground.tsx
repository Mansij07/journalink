"use client"
import { memo } from "react"
import FaultyTerminal from "@/components/ui/FaultyTerminal"

const AnimatedBackground = memo(function AnimatedBackground() {
  return (
    <div className="absolute inset-0 z-0">
      {/* @ts-ignore */}
      <FaultyTerminal
        tint="#055C3F"
        brightness={0.6}
        scale={1.5}
        curvature={0.07}
        mouseReact={true}
      />
    </div>
  )
})

export default AnimatedBackground