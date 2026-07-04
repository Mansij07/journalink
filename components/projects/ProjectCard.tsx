import Link from "next/link"

import type { ProjectWithProfessor } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SkillsRow } from "@/components/projects/SkillsRow"

function professorOf(project: ProjectWithProfessor) {
  return project.profiles ?? null
}

export function ProjectCard({ project }: { project: ProjectWithProfessor }) {
  const prof = professorOf(project)
  const profName = prof?.full_name || prof?.username || "Unknown"
  const initials = profName.slice(0, 2).toUpperCase()
  const isOpen = project.status === "Open"

  const skills = project.skills ?? []

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex h-56 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {project.type && (
            <Badge variant="outline" className="font-normal text-xs h-6 px-2.5">
              {project.type}
            </Badge>
          )}
          <Badge variant={isOpen ? "success" : "error"} className="font-normal text-xs h-6 px-2.5">
            {project.status}
          </Badge>
        </div>
      </div>

      <h3 className="line-clamp-1 text-lg font-semi bold leading-snug tracking-[-0.01em] text-foreground">
        {project.title}
      </h3>

      {skills.length > 0 && <SkillsRow skills={skills} />}

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <Avatar size="sm">
          {prof?.avatar_url && <AvatarImage src={prof.avatar_url} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm text-muted-foreground">
          {profName}
          {prof?.username && (
            <span className="text-muted-foreground/70"> · @{prof.username}</span>
          )}
        </span>
      </div>
    </Link>
  )
}
