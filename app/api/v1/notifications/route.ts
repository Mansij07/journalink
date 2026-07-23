import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const SELECT =
  "id, type, read, created_at, post_id, project_id, application_id, actor:profiles!actor_id ( id, username, full_name, avatar_url )"

/** The current user's latest notifications (most recent first). */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")

  let query = supabase
    .from("notifications")
    .select(SELECT)
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })

  // Paginate when a limit is given; otherwise keep the default 50 for callers
  // (like the full-page list) that fetch without params.
  const limit = limitParam ? Number(limitParam) : null
  if (limit && limit > 0) {
    const offset = offsetParam ? Number(offsetParam) : 0
    query = query.range(offset, offset + limit - 1)
  } else {
    query = query.limit(50)
  }

  const { data } = await query

  return NextResponse.json({ notifications: data ?? [] })
}

/** Mark all of the current user's notifications read. */
export async function PATCH() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("read", false)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
