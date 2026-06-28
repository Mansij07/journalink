"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
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

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professorId: string
  /** When provided, the form edits this project instead of creating one. */
  project?: Project
}

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export function ProjectForm({
  open,
  onOpenChange,
  professorId,
  project,
}: ProjectFormProps) {
  const router = useRouter()
  const [supabase] = React.useState(() => createClient())
  const isEdit = Boolean(project)

  const [title, setTitle] = React.useState(project?.title ?? "")
  const [type, setType] = React.useState(project?.type ?? "")
  const [description, setDescription] = React.useState(project?.description ?? "")
  const [requirements, setRequirements] = React.useState(project?.requirements ?? "")
  const [skills, setSkills] = React.useState((project?.skills ?? []).join(", "))
  const [slots, setSlots] = React.useState(project?.slots ? String(project.slots) : "")
  const [deadline, setDeadline] = React.useState(project?.deadline ?? "")
  const [status, setStatus] = React.useState<string>(project?.status ?? "Open")

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset local state whenever a different project (or create) opens.
  React.useEffect(() => {
    if (!open) return
    setTitle(project?.title ?? "")
    setType(project?.type ?? "")
    setDescription(project?.description ?? "")
    setRequirements(project?.requirements ?? "")
    setSkills((project?.skills ?? []).join(", "))
    setSlots(project?.slots ? String(project.slots) : "")
    setDeadline(project?.deadline ?? "")
    setStatus(project?.status ?? "Open")
    setError(null)
  }, [open, project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setSubmitting(true)
    setError(null)

    const payload = {
      title: title.trim(),
      type: type.trim() || null,
      description: description.trim() || null,
      requirements: requirements.trim() || null,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      slots: slots ? Number(slots) : null,
      deadline: deadline || null,
      status,
    }

    const { error: dbError } = isEdit
      ? await supabase.from("project").update(payload).eq("id", project!.id)
      : await supabase.from("project").insert({ ...payload, professor_id: professorId })

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your research project details."
              : "Post a research project to recruit student collaborators."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="project-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-title">Title</FieldLabel>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ML for protein folding"
                required
              />
            </Field>

            <Field orientation="responsive">
              <Field>
                <FieldLabel htmlFor="project-type">Type</FieldLabel>
                <Input
                  id="project-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Thesis, Internship"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-status">Status</FieldLabel>
                <select
                  id="project-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={selectClassName}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </Field>
            </Field>

            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is the project about?"
                rows={4}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-requirements">Requirements</FieldLabel>
              <Textarea
                id="project-requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Prerequisites, expected commitment, etc."
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-skills">Skills</FieldLabel>
              <Input
                id="project-skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Python, PyTorch, Statistics"
              />
              <FieldDescription>Comma-separated.</FieldDescription>
            </Field>

            <Field orientation="responsive">
              <Field>
                <FieldLabel htmlFor="project-slots">Open slots</FieldLabel>
                <Input
                  id="project-slots"
                  type="number"
                  min={0}
                  value={slots}
                  onChange={(e) => setSlots(e.target.value)}
                  placeholder="e.g. 2"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-deadline">Deadline</FieldLabel>
                <Input
                  id="project-deadline"
                  type="date"
                  value={deadline ?? ""}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </Field>
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
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
          <Button type="submit" form="project-form" disabled={submitting}>
            {submitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save changes"
                : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
