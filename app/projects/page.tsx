import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import type { ProjectWithProfessor } from "@/lib/types"
import { ProjectsView } from "@/components/projects/ProjectsView"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isProf = (profile?.role ?? "Student") === "Prof"

  // Professors see their own projects; students see all open ones.
  let query = supabase
    .from("project")
    .select(
      "*, profiles!professor_id(id, username, full_name, avatar_url, role)"
    )
    .order("created_at", { ascending: false })

  query = isProf
    ? query.eq("professor_id", user.id)
    : query.eq("status", "Open")

  const { data: projects } = await query

  return (
    <ProjectsView
      projects={(projects as ProjectWithProfessor[]) ?? []}
      isProf={isProf}
      professorId={user.id}
    />
  )
}
