"use client"

import * as React from "react"
import Link from "next/link"

import type { StudentApplication } from "@/components/applications/ApplicationsView"
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge"
import { RelativeTime } from "@/components/feed/RelativeTime"
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
 * A student's own applications as a paginated card grid on their profile,
 * mirroring [ProfileProjects]. Read-only — accept/decline/leave actions live on
 * the /applications page. Client component so it can hold page state while the
 * parent profile page stays a server component.
 */
export function ProfileApplications({
  applications,
}: {
  applications: StudentApplication[]
}) {
  const [page, setPage] = React.useState(1)

  const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageApplications = applications.slice(start, start + PAGE_SIZE)

  function goToPage(next: number) {
    setPage(Math.min(totalPages, Math.max(1, next)))
  }

  return (
    <>
      <StaggerContainer
        revealKey={currentPage}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {pageApplications.map((app) => {
          const prof = app.project?.profiles
          const profName = prof?.full_name || prof?.username || "Unknown"
          return (
            <Link
              key={app.id}
              href={app.project ? `/projects/${app.project.id}` : "#"}
              className="group flex h-44 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <ApplicationStatusBadge status={app.status} />
              </div>

              <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.01em] text-foreground">
                {app.project?.title ?? "Untitled project"}
              </h3>

              <div className="mt-auto text-sm text-muted-foreground">
                <p className="truncate">{profName}</p>
                <p className="mt-1">
                  Applied <RelativeTime dateString={app.created_at} /> ago
                </p>
              </div>
            </Link>
          )
        })}
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
