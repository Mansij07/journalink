"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Badge } from "@/components/ui/badge"
import { ProfileCard, type ProfileCardData } from "@/components/profile-card"

type Profile = {
  id: string
  username: string
  role: string
  avatar_url: string | null
  full_name: string | null
}

interface ProfileClientProps {
  suggestions: ProfileCardData[]
  followsYouIds: string[]
  recent: ProfileCardData[]
  followingIds: string[]
  currentUserId: string
}

export function ProfileClient({
  suggestions,
  followsYouIds,
  recent: initialRecent,
  followingIds,
}: ProfileClientProps) {
  const [search, setSearch] = useState("")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<ProfileCardData[]>(initialRecent)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set(followingIds))
  const ref = useRef<HTMLDivElement>(null)

  async function toggleFollow(id: string) {
    const isFollowing = followingSet.has(id)
    setFollowingSet((prev) => {
      const next = new Set(prev)
      if (isFollowing) next.delete(id)
      else next.add(id)
      return next
    })

    const res = await fetch("/api/follows", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: id }),
    }).catch(() => null)

    if (!res || !res.ok) {
      // revert on failure
      setFollowingSet((prev) => {
        const next = new Set(prev)
        if (isFollowing) next.add(id)
        else next.delete(id)
        return next
      })
    }
  }

  function recordRecent(profile: Profile) {
    // Background record only — no optimistic list update, so the profile opens
    // first and the entry shows up in Recently searched on return (via the mount
    // refetch). keepalive so it still commits as the click triggers navigation.
    fetch("/api/recent-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
      keepalive: true,
    }).catch(() => {})
  }

  async function clearRecent() {
    setRecent([])
    await fetch("/api/recent-searches", { method: "DELETE" }).catch(() => {})
  }

  // Refetch recent searches whenever the page mounts, so returning to the search
  // page (which may serve a stale cached RSC) always shows the latest list.
  useEffect(() => {
    fetch("/api/recent-searches")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRecent(d.recent))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length === 0) {
        setProfiles([])
        setOpen(false)
        return
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const { profiles: profileData } = await res.json()
        setProfiles(profileData ?? [])
      }
      setOpen(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div ref={ref} className="relative w-full max-w-sm mx-auto mb-8">
          <InputGroup className="w-full">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search profiles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.length > 0 && setOpen(true)}
            />
          </InputGroup>

          {open && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl z-50 overflow-hidden">

              {profiles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground px-3 pt-3 pb-1">Profiles</p>
                  {profiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href={`/profiles/${profile.username}`}
                      onClick={() => {
                        recordRecent(profile)
                        setOpen(false)
                      }}
                      className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                    >
                      <span className="text-foreground text-sm">{profile.username}</span>
                      <Badge variant="secondary" className="text-xs">
                        {profile.role}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {profiles.length === 0 && (
                <p className="text-muted-foreground text-sm px-3 py-4">No results found.</p>
              )}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-[-0.01em] text-foreground">Recently searched</h2>
              <button
                type="button"
                onClick={clearRecent}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  followsYou={followsYouIds.includes(profile.id)}
                  followed={followingSet.has(profile.id)}
                  onToggleFollow={() => toggleFollow(profile.id)}
                />
              ))}
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground mb-4">Recommended profiles</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  followsYou={followsYouIds.includes(profile.id)}
                  followed={followingSet.has(profile.id)}
                  onToggleFollow={() => toggleFollow(profile.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
