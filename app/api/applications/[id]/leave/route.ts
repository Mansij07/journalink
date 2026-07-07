import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateProjects } from "@/lib/projects"
import { invalidateApplications } from "@/lib/applications"

/**
 * Student requests to leave a project they've joined. The row stays `confirmed`
 * (still occupying a slot) until the owning professor resolves the request via
 * PATCH — the `request_leave` RPC enforces that the caller is the applicant.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.rpc("request_leave", { p_application_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // The `leave_requested` flag now shows in both the student's and professor's lists.
  const { data: app } = await supabase
    .from("applications")
    .select("applicant_id, project:project_id ( professor_id )")
    .eq("id", id)
    .maybeSingle()
  const project = (app?.project ?? null) as { professor_id: string } | null
  if (app && project) await invalidateApplications(app.applicant_id as string, project.professor_id)

  return NextResponse.json({ ok: true })
}

/**
 * Owning professor approves or denies a leave request. Approving frees the slot
 * and marks the application `left`; the `resolve_leave_request` RPC enforces
 * that the caller owns the project. Bust the project caches on approve since the
 * freed slot changes the cached project list/detail.
 */
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

  let body: { approve?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "approve (boolean) required" }, { status: 400 })
  }

  const { error } = await supabase.rpc("resolve_leave_request", {
    p_application_id: id,
    p_approve: body.approve,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Either outcome (approve → `left`, deny → clears `leave_requested`) changes
  // both the student's and professor's lists, so always bust those.
  const { data: app } = await supabase
    .from("applications")
    .select("applicant_id, project:project_id ( id, professor_id )")
    .eq("id", id)
    .maybeSingle()
  const project = (app?.project ?? null) as { id: number; professor_id: string } | null
  if (app && project) await invalidateApplications(app.applicant_id as string, project.professor_id)

  if (body.approve && project) {
    // A slot was freed — target the affected project's caches too.
    await invalidateProjects(project.professor_id, project.id)
  }

  return NextResponse.json({ ok: true })
}
