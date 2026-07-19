import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getProfileById, invalidateProfile } from "@/lib/profile"

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

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/

const ALLOWED_FIELDS = [
  "full_name",
  "bio",
  "branch",
  "year",
  "skills",
  "avatar_url",
  "username",
  "role",
] as const         // Without as const, TypeScript would infer this as string[]

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
  
  if ("username" in updates) {
    const u = typeof updates.username === "string" ? updates.username.trim() : ""
    if (!USERNAME_RE.test(u)) {
      return NextResponse.json(
        { error: "Username may only contain letters, numbers, and underscores (3–30 chars), no spaces." },
        { status: 400 }
      )
    }
    updates.username = u
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
