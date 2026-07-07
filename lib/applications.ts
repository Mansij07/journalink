import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete } from "@/lib/redis"
import type {
  ProfessorApplication,
  StudentApplication,
} from "@/components/applications/ApplicationsView"

/**
 * Application lists change on many actions (apply/accept/reject/decline/leave),
 * so the TTL is short and is really just a backstop — every mutation route busts
 * the relevant keys via `invalidateApplications` so the list stays fresh.
 */
const APPLICATIONS_TTL = 60

const professorApplicationsKey = (professorId: string) =>
  `applications:prof:${professorId}`
const studentApplicationsKey = (applicantId: string) =>
  `applications:student:${applicantId}`

/** Applications across all of a professor's projects, newest first. */
export async function getProfessorApplications(
  supabase: SupabaseClient,
  professorId: string
): Promise<ProfessorApplication[]> {
  return cacheGetOrSet(professorApplicationsKey(professorId), APPLICATIONS_TTL, async () => {
    const { data } = await supabase
      .from("applications")
      .select(
        "id, status, message, leave_requested, created_at, project!inner ( id, title, professor_id ), applicant:profiles!applicant_id ( id, username, full_name, avatar_url, role )"
      )
      .eq("project.professor_id", professorId)
      .order("created_at", { ascending: false })
    return (data as unknown as ProfessorApplication[]) ?? []
  })
}

/** A student's own applications, newest first. */
export async function getStudentApplications(
  supabase: SupabaseClient,
  applicantId: string
): Promise<StudentApplication[]> {
  return cacheGetOrSet(studentApplicationsKey(applicantId), APPLICATIONS_TTL, async () => {
    const { data } = await supabase
      .from("applications")
      .select(
        "id, status, message, leave_requested, created_at, project ( id, title, status, profiles!professor_id ( id, username, full_name, avatar_url ) )"
      )
      .eq("applicant_id", applicantId)
      .order("created_at", { ascending: false })
    return (data as unknown as StudentApplication[]) ?? []
  })
}

/**
 * Bust both sides of an application after any mutation: the student's list and
 * the owning professor's list (an accept/reject/decline/apply/leave changes what
 * both of them see).
 */
export async function invalidateApplications(
  applicantId: string,
  professorId: string
): Promise<void> {
  await cacheDelete(
    studentApplicationsKey(applicantId),
    professorApplicationsKey(professorId)
  )
}
