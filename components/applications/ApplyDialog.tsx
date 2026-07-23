"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MAX_RESUME_BYTES = 5 * 1024 * 1024

interface ApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  projectTitle: string
  applicantId: string
  resumeRequired?: boolean
  onApplied?: () => void
}

export function ApplyDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  resumeRequired = false,
  onApplied,
}: ApplyDialogProps) {
  const router = useRouter()
  const [message, setMessage] = React.useState("")
  const [resume, setResume] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMessage("")
      setResume(null)
      setError(null)
    }
  }

  React.useEffect(() => {
    if (open && fileInputRef.current) fileInputRef.current.value = ""
  }, [open])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0] ?? null
    if (file && file.type !== "application/pdf") {
      setError("Resume must be a PDF file.")
      setResume(null)
      e.target.value = ""
      return
    }
    if (file && file.size > MAX_RESUME_BYTES) {
      setError("Resume must be 5 MB or smaller.")
      setResume(null)
      e.target.value = ""
      return
    }
    setResume(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resumeRequired && !resume) {
      setError("A resume (PDF) is required to apply to this project.")
      return
    }
    setSubmitting(true)
    setError(null)

    let resumeUrl: string | null = null
    if (resume) {
      const fd = new FormData()
      fd.append("file", resume)
      fd.append("bucket", "resumes")
      fd.append("kind", "resume")
      const uploadRes = await fetch("api/uploads", { method: "POST", body: fd })
      if (!uploadRes.ok) {
        setSubmitting(false)
        const { error: msg } = await uploadRes.json().catch(() => ({ error: "Resume upload failed" }))
        setError(msg ?? "Resume upload failed")
        return
      }
      resumeUrl = (await uploadRes.json()).url
    }

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, message: message.trim() || null, resumeUrl }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Submit failed" }))
      setError(msg ?? "Submit failed")
      return
    }

    const { id } = await res.json().catch(() => ({ id: null }))
    toast.success("Application submitted", {
      description: projectTitle,
      action: id
        ? {
          label: "Undo",
          onClick: async () => {
            const del = await fetch(`/api/applications/${id}`, { method: "DELETE" })
            if (del.ok) {
              toast.success("Application withdrawn")
              router.refresh()
            } else {
              toast.error("Couldn't undo — it may already be reviewed")
            }
          },
        }
        : undefined,
    })

    onApplied?.()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to project</DialogTitle>
          <DialogDescription className="truncate">{projectTitle}</DialogDescription>
        </DialogHeader>

        <form id="apply-form" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="apply-message">Cover note</FieldLabel>
            <Textarea
              id="apply-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly introduce yourself and why you're a fit for this project."
              className="h-40 resize-none field-sizing-fixed overflow-y-auto"
            />
            <FieldDescription>
              Optional, but a short note helps the professor.
            </FieldDescription>
          </Field>

          <Field className="mt-4">
            <FieldLabel htmlFor="apply-resume">
              Resume (PDF){resumeRequired ? "" : " — optional"}
            </FieldLabel>
            <input
              ref={fileInputRef}
              id="apply-resume"
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            />
            <FieldDescription>
              {resumeRequired
                ? "This project requires a resume. PDF, up to 5 MB."
                : "Attach a resume if you'd like. PDF, up to 5 MB."}
            </FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="apply-form" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
