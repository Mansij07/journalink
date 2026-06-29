"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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

interface ApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  projectTitle: string
  applicantId: string
  onApplied?: () => void
}

export function ApplyDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  applicantId,
  onApplied,
}: ApplyDialogProps) {
  const router = useRouter()
  const [message, setMessage] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setMessage("")
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, message: message.trim() || null }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Submit failed" }))
      setError(msg ?? "Submit failed")
      return
    }

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
              rows={5}
            />
            <FieldDescription>
              Optional, but a short note helps the professor.
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
