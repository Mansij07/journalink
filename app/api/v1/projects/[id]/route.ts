import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateProjects, shouldAutoClose } from "@/lib/projects"

const ALLOWED_FIELDS = [
  "title",
  "type",
  "description",
  "requirements",
  "skills",
  "slots",
  "deadline",
  "status",
  "resume_required",
] as const

function pickFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) out[key] = body[key]
  }
  return out
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const updates = pickFields(body)
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }

  if (
    ("deadline" in updates || "slots" in updates) &&
    shouldAutoClose(
      updates.deadline as string | null | undefined,
      updates.slots as number | null | undefined
    )
  ) {
    updates.status = "Closed"
  }

  const { data, error } = await supabase
    .from("project")
    .update(updates)
    .eq("id", id)
    .eq("professor_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) {
    return NextResponse.json(
      { error: "Project not found or you don't have permission to edit it." },
      { status: 404 }
    )
  }

  await invalidateProjects(user.id, id)
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("project")
    .delete()
    .eq("id", id)
    .eq("professor_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) {
    return NextResponse.json(
      { error: "Project not found or you don't have permission to delete it." },
      { status: 404 }
    )
  }

  await invalidateProjects(user.id, id)
  return NextResponse.json({ ok: true })
}
