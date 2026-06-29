import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateProjects } from "@/lib/projects"

const ALLOWED_FIELDS = [
  "title",
  "type",
  "description",
  "requirements",
  "skills",
  "slots",
  "deadline",
  "status",
] as const

/** Update a project the current user owns, then bust project caches. */
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

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }

  // Ownership is enforced both here (professor_id) and by RLS.
  const { data, error } = await supabase
    .from("project")
    .update(updates)
    .eq("id", id)
    .eq("professor_id", user.id)
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateProjects(user.id, id)
  return NextResponse.json(data)
}
