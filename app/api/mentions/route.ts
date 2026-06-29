import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Profiles the current user follows — the candidate pool for @-mention
 * autocomplete. The client filters this list by the typed query.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
  const ids = (follows ?? []).map((f) => f.following_id)
  if (ids.length === 0) return NextResponse.json({ profiles: [] })

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids)

  return NextResponse.json({ profiles: profiles ?? [] })
}
