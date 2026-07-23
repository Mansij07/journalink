import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateFollow } from "@/lib/social"

export async function POST(request: Request) {      // it's structured as an action/RPC-style endpoint (body-driven).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let followerId: string | null = null
  try {
    const body = await request.json()
    followerId = typeof body?.followerId === "string" ? body.followerId : null
  } catch {
    followerId = null
  }
  if (!followerId) {
    return NextResponse.json({ error: "followerId required" }, { status: 400 })
  }

  const admin = createAdminClient()          // this service-role key is Postgres's "ignore RLS entirely" credential 
  const { error } = await admin
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFollow(followerId, user.id)
  return NextResponse.json({ ok: true })
}
