"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Profile = { id: string; username: string; role: string }
type Project = {
  id: number
  title: string
  type: string
  status: string
  professor_id: string
  profiles: { username: string }[] | { username: string } | null
}

export function ProfileClient() {
  const [search, setSearch] = useState("")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        setProjects([])
        setOpen(false)
        return
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const { profiles: profileData, projects: projectData } = await res.json()
        setProfiles(profileData ?? [])
        setProjects(projectData ?? [])
      }
      setOpen(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 px-6">
      <div className="w-full max-w-sm">
        <div ref={ref} className="relative w-full max-w-sm">
          <InputGroup className="w-full">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search profiles or projects..."
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
                      onClick={() => setOpen(false)}
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

              {profiles.length > 0 && projects.length > 0 && (
                <Separator className="my-1" />
              )}

              {projects.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground px-3 pt-3 pb-1">Projects</p>
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-foreground text-sm">{project.title}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {Array.isArray(project.profiles)
                            ? project.profiles[0]?.username
                            : project.profiles?.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {project.type}
                        </Badge>
                        <Badge
                          variant={project.status === "Open" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {profiles.length === 0 && projects.length === 0 && (
                <p className="text-muted-foreground text-sm px-3 py-4">No results found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
