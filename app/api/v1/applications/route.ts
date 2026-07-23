import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { acceptCapForYear, getProfileById } from "@/lib/profile"
import { invalidateApplications } from "@/lib/applications"

/** Apply to a project as the current user. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { projectId?: unknown; message?: unknown; resumeUrl?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const projectId = Number(body.projectId)
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  // Only accept a resume URL that lives in our own public resumes bucket.
  const resumeUrl =
    typeof body.resumeUrl === "string" &&
    body.resumeUrl.includes("/storage/v1/object/public/resumes/")
      ? body.resumeUrl
      : null

  // Gate: a student who has already joined their year's limit of projects may
  // not apply to more. Mirrors the join cap enforced by `confirm_application`.
  const [profile, { count: confirmedCount }, { data: project }] = await Promise.all([
    getProfileById(supabase, user.id),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("applicant_id", user.id)
      .eq("status", "confirmed"),
    supabase
      .from("project")
      .select("professor_id, resume_required")
      .eq("id", projectId)
      .maybeSingle(),
  ])
  if ((confirmedCount ?? 0) >= acceptCapForYear(profile?.year)) {
    return NextResponse.json(
      { error: "You've reached your project limit — leave a project before applying to more." },
      { status: 400 }
    )
  }
  if (project?.resume_required && !resumeUrl) {
    return NextResponse.json(
      { error: "A resume is required to apply to this project." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      project_id: projectId,
      applicant_id: user.id,
      message: typeof body.message === "string" && body.message.trim() ? body.message.trim() : null,
      resume_url: resumeUrl,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    // 23505 = unique_violation: already applied.
    const message =
      error.code === "23505"
        ? "You have already applied to this project."
        : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Bust both sides' cached application lists (the new row shows in the student's
  // list and the owning professor's list).
  if (project) await invalidateApplications(user.id, project.professor_id as string)

  return NextResponse.json({ id: data.id })
}
