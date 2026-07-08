"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"

import type { ApplicationStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApplicationStatusBadge } from "@/components/applications/ApplicationStatusBadge"
import { RelativeTime } from "@/components/feed/RelativeTime"
import type {
  StudentApplication,
  ProfessorApplication,
} from "@/components/applications/ApplicationsView"

type AnyApplication = StudentApplication | ProfessorApplication

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
  isOwnerProf,
  isApplicant,
  acceptCap,
  confirmedCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: AnyApplication | null
  isOwnerProf: boolean
  isApplicant: boolean
  acceptCap: number
  confirmedCount: number
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/60 backdrop-blur-sm"
        className="sm:max-w-xl max-h-[85vh] overflow-y-auto"
      >
        {application && (
          <ApplicationDialogBody
            key={application.id}
            application={application}
            isOwnerProf={isOwnerProf}
            isApplicant={isApplicant}
            acceptCap={acceptCap}
            confirmedCount={confirmedCount}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ApplicationDialogBody({
  application,
  isOwnerProf,
  isApplicant,
  acceptCap,
  confirmedCount,
  onClose,
}: {
  application: AnyApplication
  isOwnerProf: boolean
  isApplicant: boolean
  acceptCap: number
  confirmedCount: number
  onClose: () => void
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState<ApplicationStatus>(application.status)
  const [decisionMessage, setDecisionMessage] = React.useState(
    application.decision_message
  )
  const [leaveRequested, setLeaveRequested] = React.useState(
    application.leave_requested
  )
  const [note, setNote] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const capReached = confirmedCount >= acceptCap
  const project = application.project
  const counterparty =
    "applicant" in application
      ? application.applicant
      : application.project?.profiles ?? null
  const name = counterparty?.full_name || counterparty?.username || "Unknown"

  const decide = async (next: "accepted" | "rejected") => {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, message: note.trim() || null }),
    })
    setPending(false)
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Update failed" }))
      setError(msg ?? "Update failed")
      return
    }
    setStatus(next)
    setDecisionMessage(note.trim() || null)
    router.refresh()
  }

  const resolveLeave = async (approve: boolean) => {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/applications/${application.id}/leave`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    })
    setPending(false)
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Request failed" }))
      setError(msg ?? "Request failed")
      return
    }
    setLeaveRequested(false)
    if (approve) setStatus("left")
    router.refresh()
  }

  const studentAction = async (
    path: "confirm" | "decline" | "leave",
    onOk: () => void
  ) => {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/applications/${application.id}/${path}`, {
      method: "POST",
    })
    setPending(false)
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Request failed" }))
      setError(msg ?? "Request failed")
      return
    }
    onOk()
    router.refresh()
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-3 pr-6">
          <DialogTitle className="min-w-0 text-xl leading-snug">
            <Link
              href={project ? `/projects/${project.id}` : "#"}
              className="hover:underline"
              onClick={onClose}
            >
              {project?.title ?? "Untitled project"}
            </Link>
          </DialogTitle>
          <ApplicationStatusBadge status={status} className="shrink-0" />
        </div>
      </DialogHeader>

      {/* Counterparty */}
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          {counterparty?.avatar_url && (
            <AvatarImage src={counterparty.avatar_url} alt="" />
          )}
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link
            href={counterparty?.username ? `/profiles/${counterparty.username}` : "#"}
            className="text-md font-medium text-foreground hover:underline"
            onClick={onClose}
          >
            {name}
          </Link>
          <p className="text-sm text-muted-foreground">
            Applied <RelativeTime dateString={application.created_at} /> ago
          </p>
        </div>
      </div>

      {/* Cover note */}
      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cover note
        </h3>
        {application.message ? (
          <p className="whitespace-pre-wrap text-md leading-relaxed text-foreground">
            {application.message}
          </p>
        ) : (
          <p className="text-md text-muted-foreground">No note was included.</p>
        )}
      </div>

      {/* Resume */}
      {application.resume_url && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resume
          </h3>
          <Button variant="outline" size="sm" asChild>
            <a
              href={application.resume_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText data-icon="inline-start" />
              View resume (PDF)
            </a>
          </Button>
        </div>
      )}

      {/* Professor's decision note */}
      {decisionMessage && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Professor&apos;s note
          </h3>
          <p className="whitespace-pre-wrap text-md leading-relaxed text-foreground">
            {decisionMessage}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {/* Actions */}
      {isOwnerProf && status === "pending" && (
        <div className="flex flex-col gap-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Message to the applicant (optional) — e.g. why you're accepting or rejecting."
            className="h-28 resize-none field-sizing-fixed overflow-y-auto"
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => decide("accepted")} disabled={pending}>
              Accept
            </Button>
            <Button variant="ghost" onClick={() => decide("rejected")} disabled={pending}>
              Reject
            </Button>
          </div>
        </div>
      )}

      {isOwnerProf && status === "confirmed" && leaveRequested && (
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">
            Requested to leave this project
          </span>
          <Button onClick={() => resolveLeave(true)} disabled={pending}>
            Approve leave
          </Button>
          <Button variant="ghost" onClick={() => resolveLeave(false)} disabled={pending}>
            Deny
          </Button>
        </div>
      )}

      {isApplicant && status === "accepted" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => studentAction("confirm", () => setStatus("confirmed"))}
            disabled={pending || capReached}
          >
            Accept offer
          </Button>
          <Button
            variant="ghost"
            onClick={() => studentAction("decline", () => setStatus("declined"))}
            disabled={pending}
          >
            Decline
          </Button>
          {capReached && (
            <span className="text-sm text-muted-foreground">
              Limit reached — decline another to free a slot
            </span>
          )}
        </div>
      )}

      {isApplicant && status === "confirmed" && (
        <div className="flex items-center gap-2">
          {leaveRequested ? (
            <span className="text-sm text-muted-foreground">
              Leave requested — waiting for professor approval
            </span>
          ) : (
            <Button
              variant="ghost"
              onClick={() => studentAction("leave", () => setLeaveRequested(true))}
              disabled={pending}
            >
              Request to leave
            </Button>
          )}
        </div>
      )}
    </>
  )
}
