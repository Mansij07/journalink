import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/** Apply to a project as the current user. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { projectId?: unknown; message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const projectId = Number(body.projectId)
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const { error } = await supabase.from("applications").insert({
    project_id: projectId,
    applicant_id: user.id,
    message: typeof body.message === "string" && body.message.trim() ? body.message.trim() : null,
    status: "pending",
  })

  if (error) {
    // 23505 = unique_violation: already applied.
    const message =
      error.code === "23505"
        ? "You have already applied to this project."
        : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
