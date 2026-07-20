import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { ProjectWithProfessor } from "@/lib/types"
import { cacheGetOrSet, cacheDelete } from "@/lib/redis"
import { invalidateProjectCount } from "@/lib/social"
import { createAdminClient } from "@/lib/supabase/admin"

const LIST_TTL = 5 * 60 
const DETAIL_TTL = 15 * 60 

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function shouldAutoClose(
  deadline: string | null | undefined,
  slots: number | null | undefined
): boolean {
  if (deadline && deadline.slice(0, 10) < todayStr()) return true
  if (slots != null && slots <= 0) return true
  return false
}

export async function closeExpiredProjects(): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("project")
    .update({ status: "Closed" })
    .eq("status", "Open")
    .or(`deadline.lt.${todayStr()},slots.lte.0`)
    .select("id, professor_id")
  for (const row of (data ?? []) as { id: number; professor_id: string }[]) {
    await invalidateProjects(row.professor_id, row.id)
  }
}

const openProjectsKey = "projects:open"
const ownerProjectsKey = (profId: string) => `projects:owner:${profId}`
const projectKey = (id: string | number) => `project:${id}`

const PROJECT_SELECT =
  "*, profiles!professor_id ( id, username, full_name, avatar_url, role )"

export async function getOpenProjects(
  supabase: SupabaseClient
): Promise<ProjectWithProfessor[]> {
  return cacheGetOrSet(openProjectsKey, LIST_TTL, async () => {
    await closeExpiredProjects()
    const { data } = await supabase
      .from("project")
      .select(PROJECT_SELECT)
      .eq("status", "Open")
      .order("created_at", { ascending: false })
    return (data as ProjectWithProfessor[]) ?? []
  })
}

export async function getOwnerProjects(
  supabase: SupabaseClient,
  profId: string,
  openOnly = false
): Promise<ProjectWithProfessor[]> {
  return cacheGetOrSet(
    `${ownerProjectsKey(profId)}${openOnly ? ":open" : ""}`,
    LIST_TTL,
    async () => {
      await closeExpiredProjects()
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

export async function getProjectById(
  supabase: SupabaseClient,
  id: string | number
): Promise<ProjectWithProfessor | null> {
  return cacheGetOrSet(projectKey(id), DETAIL_TTL, async () => {
    await closeExpiredProjects()
    const { data } = await supabase
      .from("project")
      .select(PROJECT_SELECT)
      .eq("id", id)
      .maybeSingle()
    return (data as ProjectWithProfessor | null) ?? null
  })
}

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
