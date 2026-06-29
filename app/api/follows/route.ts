import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateFollow } from "@/lib/social"

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

async function readTargetId(request: Request): Promise<string | null> {
  try {
    const body = await request.json()
    return typeof body?.targetId === "string" ? body.targetId : null
  } catch {
    return null
  }
}

/** Follow `targetId` as the current user, then bust affected caches. */
export async function POST(request: Request) {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const targetId = await readTargetId(request)
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 })

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFollow(user.id, targetId)
  return NextResponse.json({ ok: true })
}

/** Unfollow `targetId` as the current user, then bust affected caches. */
export async function DELETE(request: Request) {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const targetId = await readTargetId(request)
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 })

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFollow(user.id, targetId)
  return NextResponse.json({ ok: true })
}
