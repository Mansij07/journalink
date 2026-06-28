"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavNotificationBell } from "@/components/layout/NavNotificationBell"

interface NavProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

const NAV_LINKS = [
  { name: "Feed", url: "/feed" },
  { name: "Projects", url: "/projects" },
  { name: "Applications", url: "/applications" },
  { name: "Search", url: "/profiles" },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = React.useState(() => createClient())
  const [profile, setProfile] = React.useState<NavProfile | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", user.id)
        .single()
      if (!cancelled && data) setProfile(data as NavProfile)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/")

  const initials = (profile?.full_name || profile?.username || "U")
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <nav className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-2 px-6">
        {/* Wordmark */}
        <Link
          href="/feed"
          className="mr-6 text-xl font-semibold tracking-[-0.03em] text-foreground"
        >
          Journalink
        </Link>

        {/* Primary links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.url)
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.name}
              {isActive(link.url) && (
                <span className="absolute inset-x-3 -bottom-[1px] h-px bg-foreground" />
              )}
            </Link>
          ))}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          {profile && (
            <NavNotificationBell
              userId={profile.id}
              active={isActive("/notifications")}
            />
          )}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar size="sm">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt="" />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate">
                {profile?.full_name || profile?.username
                  ? `@${profile?.username ?? ""}`
                  : "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profile?.username && (
                <DropdownMenuItem asChild>
                  <Link href={`/profiles/${profile.username}`}>
                    <UserIcon />
                    Profile
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <SettingsIcon />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={signOut}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  )
}
