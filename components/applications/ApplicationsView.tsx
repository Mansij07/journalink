"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Briefcase, Send } from "lucide-react"

import type { ApplicationStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge"
import { ApplicationDialog } from "@/components/applications/ApplicationDialog"
import { useStaggerReveal } from "@/lib/animations"
import { RelativeTime } from "@/components/feed/RelativeTime"

interface MiniProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role?: string | null
}

export interface StudentApplication {
  id: string
  status: ApplicationStatus
  message: string | null
  decision_message: string | null
  resume_url: string | null
  leave_requested: boolean
  created_at: string
  project: {
    id: number
    title: string
    status: string
    profiles: MiniProfile | null
  } | null
}

export interface ProfessorApplication {
  id: string
  status: ApplicationStatus
  message: string | null
  decision_message: string | null
  resume_url: string | null
  leave_requested: boolean
  created_at: string
  project: { id: number; title: string } | null
  applicant: MiniProfile | null
}

interface ApplicationsViewProps {
  isProf: boolean
  studentApplications: StudentApplication[]
  professorApplications: ProfessorApplication[]
  acceptCap?: number
  confirmedCount?: number
  scopedProjectTitle?: string
}

export function ApplicationsView({
  isProf,
  studentApplications,
  professorApplications,
  acceptCap = 1,
  confirmedCount = 0,
  scopedProjectTitle,
}: ApplicationsViewProps) {
  const isEmpty = isProf
    ? professorApplications.length === 0
    : studentApplications.length === 0
  const scoped = isProf && !!scopedProjectTitle

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-[-0.025em] text-foreground">
            {isProf ? "Applications" : "My Applications"}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            {scoped ? (
              <>
                Applications for{" "}
                <span className="text-foreground">“{scopedProjectTitle}”</span>
              </>
            ) : isProf ? (
              "Review applications from students interested in your projects"
            ) : (
              "Track the status of projects you've applied to"
            )}
          </p>
          {scoped && (
            <Link
              href="/applications"
              className="mt-2 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              View all applications
            </Link>
          )}
        </div>
        {isEmpty ? (
          <div className="flex items-center justify-center py-24">
            <Empty className="max-w-md">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No applications yet</EmptyTitle>
                <EmptyDescription>
                  {isProf
                    ? "Once students apply to your projects, their applications will appear here. Make sure your projects are open for applications"
                    : "You haven't applied to any research projects yet. Browse available projects and submit your first application"}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  {isProf ? (
                    <>
                      <Button asChild>
                        <Link href="/projects">
                          <Briefcase data-icon="inline-start" />
                          View My Projects
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/feed">Post Announcement</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild>
                        <Link href="/projects">
                          <Send data-icon="inline-start" />
                          Browse Projects
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/profiles">Find Professors</Link>
                      </Button>
                    </>
                  )}
                </div>
              </EmptyContent>
            </Empty>
          </div>
        ) : isProf ? (
          <ProfessorList applications={professorApplications} />
        ) : (
          <StudentList
            applications={studentApplications}
            acceptCap={acceptCap}
            confirmedCount={confirmedCount}
          />
        )}
      </div>
    </div>
  )
}

function StudentList({
  applications,
  acceptCap,
  confirmedCount,
}: {
  applications: StudentApplication[]
  acceptCap: number
  confirmedCount: number
}) {
  const ref = useStaggerReveal<HTMLDivElement>(applications.length)
  const capReached = confirmedCount >= acceptCap
  const [selected, setSelected] = React.useState<StudentApplication | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-md">
        <span className="text-muted-foreground">
          Accepted projects:{" "}
          <span className="font-medium text-foreground">
            {confirmedCount} of {acceptCap}
          </span>
        </span>
        {capReached && (
          <span className="text-sm text-muted-foreground">Accept limit reached for your year</span>
        )}
      </div>

      <div ref={ref} className="flex flex-col gap-3">
        {applications.map((app) => {
          const prof = app.project?.profiles
          const profName = prof?.full_name || prof?.username || "Unknown"
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => setSelected(app)}
              className="block w-full rounded-xl border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold tracking-[-0.01em] text-foreground">
                    {app.project?.title ?? "Untitled project"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {profName}
                    {prof?.username && (
                      <span className="text-muted-foreground/70"> · @{prof.username}</span>
                    )}
                  </p>
                </div>
                <ApplicationStatusBadge status={app.status} className="text-sm px-3 py-2" />
              </div>
              {app.message && (
                <p className="mt-3 line-clamp-2 text-md text-muted-foreground">{app.message}</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Applied <RelativeTime dateString={app.created_at} /> ago
              </p>
            </button>
          )
        })}
      </div>

      <ApplicationDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        application={selected}
        isOwnerProf={false}
        isApplicant
        acceptCap={acceptCap}
        confirmedCount={confirmedCount}
      />
    </div>
  )
}

function ProfessorList({ applications }: { applications: ProfessorApplication[] }) {
  const ref = useStaggerReveal<HTMLDivElement>(applications.length)
  const [selected, setSelected] = React.useState<ProfessorApplication | null>(null)

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {applications.map((app) => {
        const who = app.applicant
        const whoName = who?.full_name || who?.username || "Unknown"
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => setSelected(app)}
            className="block w-full rounded-xl border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar size="sm">
                  {who?.avatar_url && <AvatarImage src={who.avatar_url} alt="" />}
                  <AvatarFallback>{whoName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-md font-semibold text-foreground">{whoName}</p>
                  <p className="text-sm text-muted-foreground">
                    applied to {app.project?.title ?? "a project"} ·{" "}
                    <RelativeTime dateString={app.created_at} /> ago
                  </p>
                </div>
              </div>
              <ApplicationStatusBadge status={app.status} />
            </div>

            {app.message && (
              <p className="mt-3 line-clamp-2 text-md text-muted-foreground">
                {app.message}
              </p>
            )}

            {app.status === "confirmed" && app.leave_requested && (
              <p className="mt-3 text-sm text-warning">Requested to leave this project</p>
            )}
          </button>
        )
      })}

      <ApplicationDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        application={selected}
        isOwnerProf
        isApplicant={false}
        acceptCap={0}
        confirmedCount={0}
      />
    </div>
  )
}
