import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { ProjectWithProfessor } from "@/lib/types"
import { cacheGetOrSet, cacheDelete } from "@/lib/redis"
import { invalidateProjectCount } from "@/lib/social"

const LIST_TTL = 5 * 60 // open/owner lists — a few minutes
const DETAIL_TTL = 15 * 60 // a single project changes rarely

const openProjectsKey = "projects:open"
const ownerProjectsKey = (profId: string) => `projects:owner:${profId}`
const projectKey = (id: string | number) => `project:${id}`

const PROJECT_SELECT =
  "*, profiles!professor_id ( id, username, full_name, avatar_url, role )"

/** All open projects with their professor — identical for every student → global key. */
export async function getOpenProjects(
  supabase: SupabaseClient
): Promise<ProjectWithProfessor[]> {
  return cacheGetOrSet(openProjectsKey, LIST_TTL, async () => {
    const { data } = await supabase
      .from("project")
      .select(PROJECT_SELECT)
      .eq("status", "Open")
      .order("created_at", { ascending: false })
    return (data as ProjectWithProfessor[]) ?? []
  })
}

/** A professor's own projects (any status). */
export async function getOwnerProjects(
  supabase: SupabaseClient,
  profId: string,
  openOnly = false
): Promise<ProjectWithProfessor[]> {
  return cacheGetOrSet(
    `${ownerProjectsKey(profId)}${openOnly ? ":open" : ""}`,
    LIST_TTL,
    async () => {
      let query = supabase
        .from("project")
        .select(PROJECT_SELECT)
        .eq("professor_id", profId)
        .order("created_at", { ascending: false })
      if (openOnly) query = query.eq("status", "Open")
      const { data } = await query
      return (data as ProjectWithProfessor[]) ?? []
    }
  )
}

/** A single project + its professor. Per-viewer fields (applications) are NOT cached here. */
export async function getProjectById(
  supabase: SupabaseClient,
  id: string | number
): Promise<ProjectWithProfessor | null> {
  return cacheGetOrSet(projectKey(id), DETAIL_TTL, async () => {
    const { data } = await supabase
      .from("project")
      .select(PROJECT_SELECT)
      .eq("id", id)
      .maybeSingle()
    return (data as ProjectWithProfessor | null) ?? null
  })
}

/**
 * Bust every cache touched by creating/updating/deleting a project: the global
 * open list, the owner's lists (both variants), the detail entry (if known),
 * and the owner's project count.
 */
export async function invalidateProjects(
  profId: string,
  projectId?: string | number
): Promise<void> {
  await cacheDelete(
    openProjectsKey,
    ownerProjectsKey(profId),
    `${ownerProjectsKey(profId)}:open`,
    ...(projectId != null ? [projectKey(projectId)] : [])
  )
  await invalidateProjectCount(profId)
}
