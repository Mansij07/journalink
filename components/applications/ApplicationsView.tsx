"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Briefcase, Send } from "lucide-react"

import type { ApplicationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
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
import { useStaggerReveal } from "@/lib/animations"
import { formatRelativeTime } from "@/components/feed/utils"

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
}

export function ApplicationsView({
  isProf,
  studentApplications,
  professorApplications,
  acceptCap = 1,
  confirmedCount = 0,
}: ApplicationsViewProps) {
  const isEmpty = isProf
    ? professorApplications.length === 0
    : studentApplications.length === 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[820px] px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
            {isProf ? "Applications" : "My Applications"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isProf
              ? "Review applications from students interested in your projects."
              : "Track the status of projects you've applied to."}
          </p>
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
                    ? "Once students apply to your projects, their applications will appear here. Make sure your projects are open for applications."
                    : "You haven't applied to any research projects yet. Browse available projects and submit your first application."}
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
  const [items, setItems] = React.useState(applications)
  const [confirmed, setConfirmed] = React.useState(confirmedCount)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const ref = useStaggerReveal<HTMLDivElement>(applications.length)

  const capReached = confirmed >= acceptCap

  const accept = async (id: string) => {
    setPendingId(id)
    setError(null)
    const res = await fetch(`/api/applications/${id}/confirm`, { method: "POST" })
    setPendingId(null)
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Accept failed" }))
      setError(msg ?? "Accept failed")
      return
    }
    setItems((list) => list.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a)))
    setConfirmed((c) => c + 1)
  }

  const decline = async (id: string) => {
    setPendingId(id)
    const prev = items
    setItems((list) => list.map((a) => (a.id === id ? { ...a, status: "declined" } : a)))
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    })
    setPendingId(null)
    if (!res.ok) setItems(prev)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Accepted projects:{" "}
          <span className="font-medium text-foreground">
            {confirmed} of {acceptCap}
          </span>
        </span>
        {capReached && (
          <span className="text-xs text-muted-foreground">Accept limit reached for your year</span>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div ref={ref} className="flex flex-col gap-3">
        {items.map((app) => {
          const prof = app.project?.profiles
          const profName = prof?.full_name || prof?.username || "Unknown"
          const offered = app.status === "accepted"
          return (
            <div
              key={app.id}
              className="rounded-xl border border-border bg-card p-4 text-card-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={app.project ? `/projects/${app.project.id}` : "#"}
                    className="text-sm font-semibold tracking-[-0.01em] text-foreground hover:underline"
                  >
                    {app.project?.title ?? "Untitled project"}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {profName}
                    {prof?.username && (
                      <span className="text-muted-foreground/70"> · @{prof.username}</span>
                    )}
                  </p>
                </div>
                <ApplicationStatusBadge status={app.status} />
              </div>
              {app.message && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{app.message}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Applied {formatRelativeTime(app.created_at)} ago
              </p>

              {offered && (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => accept(app.id)}
                    disabled={pendingId === app.id || capReached}
                  >
                    Accept offer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => decline(app.id)}
                    disabled={pendingId === app.id}
                  >
                    Decline
                  </Button>
                  {capReached && (
                    <span className="text-xs text-muted-foreground">
                      Limit reached — decline another to free a slot
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProfessorList({ applications }: { applications: ProfessorApplication[] }) {
  const [items, setItems] = React.useState(applications)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const ref = useStaggerReveal<HTMLDivElement>(applications.length)

  const decide = async (id: string, status: ApplicationStatus) => {
    setPendingId(id)
    const prev = items
    setItems((list) =>
      list.map((a) => (a.id === id ? { ...a, status } : a))
    )
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setPendingId(null)
    if (!res.ok) setItems(prev) // revert on failure
  }

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {items.map((app) => {
        const who = app.applicant
        const whoName = who?.full_name || who?.username || "Unknown"
        const decided = app.status !== "pending"
        return (
          <div
            key={app.id}
            className="rounded-xl border border-border bg-card p-4 text-card-foreground"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar size="sm">
                  {who?.avatar_url && <AvatarImage src={who.avatar_url} alt="" />}
                  <AvatarFallback>{whoName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link
                    href={who?.username ? `/profiles/${who.username}` : "#"}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    {whoName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    applied to{" "}
                    <Link
                      href={app.project ? `/projects/${app.project.id}` : "#"}
                      className="text-foreground hover:underline"
                    >
                      {app.project?.title ?? "a project"}
                    </Link>{" "}
                    · {formatRelativeTime(app.created_at)} ago
                  </p>
                </div>
              </div>
              <ApplicationStatusBadge status={app.status} />
            </div>

            {app.message && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {app.message}
              </p>
            )}

            <div className={cn("mt-3 flex items-center gap-2", decided && "hidden")}>
              <Button
                size="sm"
                onClick={() => decide(app.id, "accepted")}
                disabled={pendingId === app.id}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => decide(app.id, "rejected")}
                disabled={pendingId === app.id}
              >
                Reject
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
