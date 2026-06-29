import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import { acceptCapForYear, getProfileById } from "@/lib/profile"
import {
  ApplicationsView,
  type StudentApplication,
  type ProfessorApplication,
} from "@/components/applications/ApplicationsView"

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfileById(supabase, user.id)

  const isProf = (profile?.role ?? "Student") === "Prof"
  const acceptCap = acceptCapForYear(profile?.year ?? null)

  let studentApplications: StudentApplication[] = []
  let professorApplications: ProfessorApplication[] = []
  let confirmedCount = 0

  if (isProf) {
    // Applications across all of this professor's projects.
    const { data } = await supabase
      .from("applications")
      .select(
        "id, status, message, created_at, project!inner ( id, title, professor_id ), applicant:profiles!applicant_id ( id, username, full_name, avatar_url, role )"
      )
      .eq("project.professor_id", user.id)
      .order("created_at", { ascending: false })
    professorApplications = (data as unknown as ProfessorApplication[]) ?? []
  } else {
    const { data } = await supabase
      .from("applications")
      .select(
        "id, status, message, created_at, project ( id, title, status, profiles!professor_id ( id, username, full_name, avatar_url ) )"
      )
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false })
    studentApplications = (data as unknown as StudentApplication[]) ?? []
    confirmedCount = studentApplications.filter((a) => a.status === "confirmed").length
  }

  return (
    <ApplicationsView
      isProf={isProf}
      studentApplications={studentApplications}
      professorApplications={professorApplications}
      acceptCap={acceptCap}
      confirmedCount={confirmedCount}
    />
  )
}
