import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import { getProfileById } from "@/lib/profile"
import { getOpenProjects, getOwnerProjects } from "@/lib/projects"
import { ProjectsView } from "@/components/projects/ProjectsView"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfileById(supabase, user.id)

  const isProf = (profile?.role ?? "Student") === "Prof"

  // Professors see their own projects; students see all open ones.
  const projects = isProf
    ? await getOwnerProjects(supabase, user.id)
    : await getOpenProjects(supabase)

  return (
    <ProjectsView projects={projects} isProf={isProf} />
  )
}
