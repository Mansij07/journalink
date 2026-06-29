import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateProjects } from "@/lib/projects"

/**
 * Confirm (accept) an application via the atomic `confirm_application` RPC,
 * then bust the related project caches — confirming can change the project's
 * slots/status, which the cached project list/detail would otherwise show stale.
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

  const { error } = await supabase.rpc("confirm_application", { p_application_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Find the affected project so we can target its caches.
  const { data: app } = await supabase
    .from("applications")
    .select("project:project_id ( id, professor_id )")
    .eq("id", id)
    .maybeSingle()
  const project = (app?.project ?? null) as { id: number; professor_id: string } | null
  if (project) await invalidateProjects(project.professor_id, project.id)

  return NextResponse.json({ ok: true })
}
