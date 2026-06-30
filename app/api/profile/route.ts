import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getProfileById, invalidateProfile } from "@/lib/profile"

/** The current user's profile (served from the Redis cache). */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const profile = await getProfileById(supabase, user.id)
  return NextResponse.json(profile)
}

/** Fields a user is allowed to change on their own profile. */
const ALLOWED_FIELDS = [
  "full_name",
  "bio",
  "branch",
  "year",
  "skills",
  "avatar_url",
  "username",
  "role",
] as const

/**
 * Update the current user's profile, then bust its Redis cache entries.
 *
 * This is the server-side seam the client forms lacked: profile writes used to
 * go straight from the browser to Supabase, so nothing could call the
 * server-only `invalidateProfile`. The cookie-bound Supabase client keeps RLS
 * in force, so a user can still only update their own row.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  await invalidateProfile(user.id, data?.username ?? null)
  return NextResponse.json(data)
}
