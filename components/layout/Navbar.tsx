"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  Newspaper,
  Briefcase,
  FileText,
  Search,
} from "lucide-react"

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
import { NavNotificationBell } from "@/components/layout/NavNotificationBell"
import { TypingAnimation } from "@/components/ui/typing-animation"

interface NavProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

const NAV_LINKS = [
  { name: "Feed", url: "/feed", icon: Newspaper },
  { name: "Projects", url: "/projects", icon: Briefcase },
  { name: "Applications", url: "/applications", icon: FileText },
  { name: "Search", url: "/profiles", icon: Search },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = React.useState(() => createClient())
  const [profile, setProfile] = React.useState<NavProfile | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch("/api/profile")
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (!cancelled && data) setProfile(data as NavProfile)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
    <>
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-[1450px] items-center gap-2 px-4 md:px-0">
        {/* Wordmark */}
        <Link
          href="/feed"
          className="mr-2 inline-block min-w-[8rem]"
          aria-label="Journalink home"
        >
          <TypingAnimation
            words={["Journalink"]}
            loop
            as="span"
            className="text-xl font-semibold leading-none tracking-[-0.03em] text-foreground"
          />
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

    {/* Mobile-only bottom tab bar */}
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background/95 to-background/60 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_LINKS.map(({ name, url, icon: Icon }) => (
          <Link
            key={url}
            href={url}
            aria-current={isActive(url) ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              isActive(url) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-1 transition-colors",
                isActive(url) && "bg-muted"
              )}
            >
              <Icon className="size-5" />
            </span>
            {name}
          </Link>
        ))}
      </div>
    </nav>
    </>
  )
}
