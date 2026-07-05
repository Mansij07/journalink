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

  // When the edit touches deadline/slots, auto-close if the new values are
  // already past/exhausted — this also prevents manually re-opening an expired
  // project. A partial edit that omits both is left to the read-time sweep.
  if (
    ("deadline" in updates || "slots" in updates) &&
    shouldAutoClose(
      updates.deadline as string | null | undefined,
      updates.slots as number | null | undefined
    )
  ) {
    updates.status = "Closed"
  }

  // Ownership is enforced both here (professor_id) and by RLS. maybeSingle()
  // returns null (rather than throwing "cannot coerce…") when no row matches —
  // e.g. the project doesn't exist, isn't owned by the user, or an RLS UPDATE
  // policy blocked the write.
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
