import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import { acceptCapForYear, getProfileById } from "@/lib/profile"
import {
  getProfessorApplications,
  getProfessorApplicationsForProject,
  getStudentApplications,
} from "@/lib/applications"
import {
  ApplicationsView,
  type StudentApplication,
  type ProfessorApplication,
} from "@/components/applications/ApplicationsView"

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfileById(supabase, user.id)

  const isProf = (profile?.role ?? "Student") === "Prof"
  const acceptCap = acceptCapForYear(profile?.year ?? null)
  const { project: projectParam } = await searchParams

  let studentApplications: StudentApplication[] = []
  let professorApplications: ProfessorApplication[] = []
  let confirmedCount = 0
  let scopedProjectTitle: string | undefined

  if (isProf) {
    const projectId = Number(projectParam)
    if (projectParam && Number.isFinite(projectId)) {
      const { data: proj } = await supabase
        .from("project")
        .select("title")
        .eq("id", projectId)
        .eq("professor_id", user.id)
        .maybeSingle()
      if (proj) {
        scopedProjectTitle = proj.title as string
        professorApplications = await getProfessorApplicationsForProject(
          supabase,
          user.id,
          projectId
        )
      }
    }
    if (!scopedProjectTitle) {
      professorApplications = await getProfessorApplications(supabase, user.id)
    }
  } else {
    studentApplications = await getStudentApplications(supabase, user.id)
    confirmedCount = studentApplications.filter((a) => a.status === "confirmed").length
  }

  return (
    <ApplicationsView
      isProf={isProf}
      studentApplications={studentApplications}
      professorApplications={professorApplications}
      acceptCap={acceptCap}
      confirmedCount={confirmedCount}
      scopedProjectTitle={scopedProjectTitle}
    />
  )
}
