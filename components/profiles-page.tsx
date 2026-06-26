"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

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
    const supabase = createClient()
    const ref = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (search.length === 0) {
                setProfiles([])
                setProjects([])
                setOpen(false)
                return
            }

            const [{ data: profileData }, { data: projectData, error: projectError }] = await Promise.all([
                supabase.from("profiles").select("id, username, role").ilike("username", `%${search}%`).limit(5),
                supabase.from("project").select("id, title, type, status, professor_id, profiles!professor_id(username)").ilike("title", `%${search}%`).limit(5)])

            if (profileData) setProfiles(profileData)
            if (projectData) setProjects(projectData)
            setOpen(true)
        }, 300)

        return () => clearTimeout(timer)
    }, [search])

    return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center pt-10 px-6">
            <div className="w-full max-w-sm">
                {/* Search with inline dropdown */}
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

                    {/* Dropdown results */}
                    {open && (
                        <div className="absolute top-full mt-2 w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl z-50 overflow-hidden shadow-lg">

                            {/* Profiles */}
                            {profiles.length > 0 && (
                                <div>
                                    <p className="text-xs text-white/50 px-3 pt-3 pb-1">Profiles</p>
                                    {profiles.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800 cursor-pointer"
                                        >
                                            <span className="text-white text-sm">{profile.username}</span>
                                            <span className="text-white/60 text-xs">{profile.role}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Separator */}
                            {profiles.length > 0 && projects.length > 0 && (
                                <div className="border-t border-slate-700 my-1" />
                            )}

                            {/* Projects */}
                            {projects.length > 0 && (
                                <div>
                                    <p className="text-xs text-white/50 px-3 pt-3 pb-1">Projects</p>
                                    {projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer"
                                        >
                                            <div>
                                                <span className="text-white text-sm">{project.title}</span>
                                                <span className="text-white/60 text-xs ml-2">
                                                     {Array.isArray(project.profiles) ? project.profiles[0]?.username : project.profiles?.username}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-white/60 text-xs">{project.type} · </span>
                                                <span className={project.status === "Open" ? "text-green-400 text-xs" : "text-red-400 text-xs"}>
                                                    {project.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* No results */}
                            {profiles.length === 0 && projects.length === 0 && (
                                <p className="text-slate-400 text-sm px-3 py-4">No results found.</p>
                            )}

                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}