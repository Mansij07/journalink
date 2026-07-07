"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Users } from "lucide-react"

import type { ApplicationStatus, ProjectWithProfessor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ApplyDialog } from "@/components/applications/ApplyDialog"
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge"
import { ProjectForm } from "@/components/projects/ProjectForm"

interface ProjectDetailActionsProps {
  project: ProjectWithProfessor
  userId: string
  isOwner: boolean
  isStudent: boolean
  profileComplete: boolean
  applied: boolean
  applicationStatus: ApplicationStatus | null
  applicationCount: number
  atCap: boolean
  acceptCap: number
}

export function ProjectDetailActions({
  project,
  userId,
  isOwner,
  isStudent,
  profileComplete,
  applied,
  applicationStatus,
  applicationCount,
  atCap,
  acceptCap,
}: ProjectDetailActionsProps) {
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [hasApplied, setHasApplied] = React.useState(applied)

  if (isOwner) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditOpen(true)}>
            <Pencil data-icon="inline-start" />
            Edit project
          </Button>
          <Button variant="outline" asChild>
            <Link href="/applications">
              <Users data-icon="inline-start" />
              {applicationCount} application{applicationCount === 1 ? "" : "s"}
            </Link>
          </Button>
        </div>
        <ProjectForm
          open={editOpen}
          onOpenChange={setEditOpen}
          professorId={userId}
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
        applicantId={userId}
        onApplied={() => setHasApplied(true)}
      />
    </>
  )
}
