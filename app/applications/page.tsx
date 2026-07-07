import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import { acceptCapForYear, getProfileById } from "@/lib/profile"
import {
  getProfessorApplications,
  getStudentApplications,
} from "@/lib/applications"
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
    professorApplications = await getProfessorApplications(supabase, user.id)
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
    />
  )
}
