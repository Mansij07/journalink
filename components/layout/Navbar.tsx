"use client"

import { Home, Briefcase, FileText, Users } from "lucide-react"
import { NavBar } from "@/components/ui/tubelight-navbar"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function Navbar() {
  const navItems = [
    { name: "Feed", url: "/feed", icon: Home },
    { name: "Projects", url: "/projects", icon: Briefcase },
    { name: "Applications", url: "/applications", icon: FileText },
    { name: "Search", url: "/profiles", icon: Users },
  ]

  return <NavBar items={navItems} />
}