import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { acceptCapForYear, getProfileById, isProfileComplete } from "@/lib/profile"
import { getProjectById } from "@/lib/projects"

/**
 * Per-viewer state for a project's action cluster (apply/owner/applied gating).
 * This is the personalized "hole" for the otherwise-shared, cache-friendly
 * project detail page — the page renders the shared shell, this endpoint fills
 * in what depends on the current user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await getProjectById(supabase, id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = project.professor_id === user.id

  const [
    { data: myApplication },
    { count: applicationCount },
    { count: confirmedCount },
    viewer,
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status")
      .eq("project_id", project.id)
      .eq("applicant_id", user.id)
      .maybeSingle(),
    isOwner
      ? supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("applicant_id", user.id)
      .eq("status", "confirmed"),
    getProfileById(supabase, user.id),
  ])

  const acceptCap = acceptCapForYear(viewer?.year)

  return NextResponse.json({
    userId: user.id,
    isOwner,
    isStudent: (viewer?.role ?? "Student") !== "Prof",
    profileComplete: isProfileComplete(viewer ?? null),
    applied: !!myApplication,
    applicationStatus: myApplication?.status ?? null,
    applicationCount: applicationCount ?? 0,
    acceptCap,
    atCap: (confirmedCount ?? 0) >= acceptCap,
  })
}
