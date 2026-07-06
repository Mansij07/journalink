import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateFollow } from "@/lib/social"

/**
 * Force-remove one of the current user's followers: delete the follows row where
 * `follower_id = followerId` and `following_id = <current user>`. RLS only lets a
 * user delete rows they authored (their own follows), so the followee can't do
 * this with the normal client — we use the service-role admin client, but scope
 * the delete to `following_id = user.id` so a user can only ever remove their own
 * followers.
 */
export async function POST(request: Request) {
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

  const admin = createAdminClient()
  const { error } = await admin
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFollow(followerId, user.id)
  return NextResponse.json({ ok: true })
}
