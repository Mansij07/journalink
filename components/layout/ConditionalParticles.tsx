"use client"

import { usePathname } from "next/navigation"
import { Particles } from "@/components/ui/particles"

const hideParticleRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"]

export function ConditionalParticles() {
  const pathname = usePathname()
  if (hideParticleRoutes.includes(pathname)) return null

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <Particles className="h-full w-full" color="#059669" quantity={110} ease={70} refresh={false} />
    </div>
  )
}
