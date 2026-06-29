import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateProjects } from "@/lib/projects"

const ALLOWED_FIELDS = [
  "title",
  "type",
  "description",
  "requirements",
  "skills",
  "slots",
  "deadline",
  "status",
] as const

function pickFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) out[key] = body[key]
  }
  return out
}

/** Create a project owned by the current user, then bust project caches. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const fields = pickFields(body)
  if (!fields.title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("project")
    .insert({ ...fields, professor_id: user.id })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateProjects(user.id, data?.id)
  return NextResponse.json(data)
}
