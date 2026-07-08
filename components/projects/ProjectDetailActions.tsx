"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Users } from "lucide-react"

import type { ApplicationStatus, ProjectWithProfessor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApplyDialog } from "@/components/applications/ApplyDialog"
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge"
import { ProjectForm } from "@/components/projects/ProjectForm"

/** Per-viewer gating state, loaded from /api/projects/[id]/viewer-state. */
interface ViewerState {
  userId: string
  isOwner: boolean
  isStudent: boolean
  profileComplete: boolean
  applied: boolean
  applicationStatus: ApplicationStatus | null
  applicationCount: number
  acceptCap: number
  atCap: boolean
}

export function ProjectDetailActions({ project }: { project: ProjectWithProfessor }) {
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [hasApplied, setHasApplied] = React.useState(false)
  const [state, setState] = React.useState<ViewerState | null>(null)

  // The personalized "hole": load the current user's gating state after mount,
  // so the project page shell can be served as shared, cache-friendly output.
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/projects/${project.id}/viewer-state`)
      if (!res.ok || cancelled) return
      const data = (await res.json()) as ViewerState
      if (cancelled) return
      setState(data)
      setHasApplied(data.applied)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [project.id])

  // Placeholder while the per-user state loads.
  if (!state) {
    return <Skeleton className="h-9 w-40 rounded-lg" />
  }

  const { isOwner, isStudent, profileComplete, applicationStatus, applicationCount, atCap, acceptCap } =
    state

  if (isOwner) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditOpen(true)}>
            <Pencil data-icon="inline-start" />
            Edit project
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/applications?project=${project.id}`}>
              <Users data-icon="inline-start" />
              {applicationCount} application{applicationCount === 1 ? "" : "s"}
            </Link>
          </Button>
        </div>
        <ProjectForm
          open={editOpen}
          onOpenChange={setEditOpen}
          professorId={state.userId}
          project={project}
        />
      </>
    )
  }

  const isOpen = project.status === "Open"

  if (hasApplied) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Application submitted</span>
        {applicationStatus && <ApplicationStatusBadge status={applicationStatus} />}
      </div>
    )
  }

  // Only students apply. A professor viewing someone else's project sees nothing.
  if (!isStudent) return null

  // Gate: students must complete their profile before applying.
  if (!profileComplete) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled>Apply to project</Button>
        <p className="text-sm text-muted-foreground">
          Complete your profile to apply.{" "}
          <Link href="/settings" className="text-foreground underline underline-offset-4">
            Go to settings
          </Link>
        </p>
      </div>
    )
  }

  // Gate: students who have joined their year's limit of projects can't apply
  // to more until they leave one.
  if (atCap) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled>Apply to project</Button>
        <p className="text-sm text-muted-foreground">
          You&apos;ve reached your project limit ({acceptCap}/{acceptCap}). Leave a project from{" "}
          <Link href="/applications" className="text-foreground underline underline-offset-4">
            your applications
          </Link>{" "}
          to apply to more.
        </p>
      </div>
    )
  }

  return (
    <>
      <Button onClick={() => setApplyOpen(true)} disabled={!isOpen}>
        {isOpen ? "Apply to project" : "Applications closed"}
      </Button>
      <ApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        projectId={project.id}
        projectTitle={project.title}
        applicantId={state.userId}
        resumeRequired={project.resume_required ?? false}
        onApplied={() => setHasApplied(true)}
      />
    </>
  )
}
