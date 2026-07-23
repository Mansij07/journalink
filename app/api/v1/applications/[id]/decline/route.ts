import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateApplications } from "@/lib/applications"

/**
 * Student declines a professor's offer (an `accepted` application). The
 * `decline_application` RPC is `SECURITY DEFINER` and enforces that the caller
 * is the applicant and the row is currently `accepted`, transitioning it to
 * `declined`. Declining an offer frees no project slot (a slot is only occupied
 * on confirm), so there are no project caches to bust here.
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

  const { error } = await supabase.rpc("decline_application", { p_application_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Bust both the student's and the professor's cached application lists.
  const { data: app } = await supabase
    .from("applications")
    .select("applicant_id, project:project_id ( professor_id )")
    .eq("id", id)
    .maybeSingle()
  const project = (app?.project ?? null) as { professor_id: string } | null
  if (app && project) await invalidateApplications(app.applicant_id as string, project.professor_id)

  return NextResponse.json({ ok: true })
}
