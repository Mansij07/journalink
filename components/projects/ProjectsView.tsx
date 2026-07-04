"use client"

import * as React from "react"
import Link from "next/link"
import { Briefcase, Plus, Search } from "lucide-react"

import type { ProjectWithProfessor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useStaggerReveal } from "@/lib/animations"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { ProjectForm } from "@/components/projects/ProjectForm"

interface ProjectsViewProps {
  projects: ProjectWithProfessor[]
  isProf: boolean
  professorId: string
}

export function ProjectsView({ projects, isProf, professorId }: ProjectsViewProps) {
  const [formOpen, setFormOpen] = React.useState(false)
  const gridRef = useStaggerReveal<HTMLDivElement>(projects.length)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.025em] text-foreground">
              {isProf ? "My Projects" : "Research Projects"}
            </h1>
            <p className="mt-1 text-md text-muted-foreground">
              {isProf
                ? "Manage your research projects and review student applications"
                : "Find research opportunities and apply to collaborate."}
            </p>
          </div>
          {isProf && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus data-icon="inline-start" />
              Create Project
            </Button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Empty className="max-w-md">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>
                  {isProf ? "No projects yet" : "No open projects"}
                </EmptyTitle>
                <EmptyDescription>
                  {isProf
                    ? "Create your first research project to start recruiting student collaborators."
                    : "There are no open research projects right now. Check back soon or browse the feed for announcements."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {isProf ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus data-icon="inline-start" />
                    Create Project
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href="/feed">
                        <Search data-icon="inline-start" />
                        Browse Feed
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/profiles">Find Professors</Link>
                    </Button>
                  </div>
                )}
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {isProf && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          professorId={professorId}
        />
      )}
    </div>
  )
}
