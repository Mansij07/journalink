"use client"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/Navbar"

export function ConditionalNavbar() {
  const pathname = usePathname()
  const hideNavbarRoutes = ["/login", "/signup", "/onboarding", "/forgot-password", "/reset-password"]

  if (hideNavbarRoutes.includes(pathname)) return null

  return <Navbar />
}