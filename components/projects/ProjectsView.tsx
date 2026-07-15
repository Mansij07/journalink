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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const PAGE_SIZE = 9

interface ProjectsViewProps {
  projects: ProjectWithProfessor[]
  isProf: boolean
}

export function ProjectsView({ projects, isProf }: ProjectsViewProps) {
  const [formOpen, setFormOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")

  const query = search.trim().toLowerCase()
  const filtered = query
    ? projects.filter((p) => {
        const prof = p.profiles
        return (
          p.title.toLowerCase().includes(query) ||
          (prof?.full_name?.toLowerCase().includes(query) ?? false) ||
          (prof?.username?.toLowerCase().includes(query) ?? false)
        )
      })
    : projects

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageProjects = filtered.slice(start, start + PAGE_SIZE)

  const gridRef = useStaggerReveal<HTMLDivElement>(currentPage)

  function goToPage(next: number) {
    setPage(Math.min(totalPages, Math.max(1, next)))
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen text-foreground">
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
          <>
            <div className="mb-8 w-full max-w-sm">
              <InputGroup className="w-full">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search by project or professor name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </InputGroup>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <p className="text-md text-muted-foreground">
                  No projects match your search.
                </p>
              </div>
            ) : (
              <>
                <div
                  ref={gridRef}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {pageProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className="mt-10">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          aria-disabled={currentPage === 1}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : undefined
                          }
                          onClick={(e) => {
                            e.preventDefault()
                            goToPage(currentPage - 1)
                          }}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === currentPage}
                              onClick={(e) => {
                                e.preventDefault()
                                goToPage(p)
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={currentPage === totalPages}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : undefined
                          }
                          onClick={(e) => {
                            e.preventDefault()
                            goToPage(currentPage + 1)
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </>
        )}
      </div>

      {isProf && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </div>
  )
}
