"use client"

import * as React from "react"

import type { ProjectWithProfessor } from "@/lib/types"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { StaggerContainer } from "@/components/StaggerContainer"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// 3 columns × 2 rows on the profile grid → paginate after 6.
const PAGE_SIZE = 6

/**
 * The professor's "Open Projects" grid with pagination, mirroring the design
 * used on the Projects tab ([ProjectsView]). Client component so it can hold
 * page state; the parent profile page stays a server component.
 */
export function ProfileProjects({ projects }: { projects: ProjectWithProfessor[] }) {
  const [page, setPage] = React.useState(1)

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageProjects = projects.slice(start, start + PAGE_SIZE)

  function goToPage(next: number) {
    setPage(Math.min(totalPages, Math.max(1, next)))
  }

  return (
    <>
      <StaggerContainer
        revealKey={currentPage}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {pageProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </StaggerContainer>

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage === 1}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(e) => {
                  e.preventDefault()
                  goToPage(currentPage - 1)
                }}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
            ))}

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
  )
}
