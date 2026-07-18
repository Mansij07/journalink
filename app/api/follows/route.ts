import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { invalidateFollow } from "@/lib/social"

async function currentUser() {
  const supabase = await createClient()  //gets supabase client scoped to session's cookies
  const {
    data: { user },
  } = await supabase.auth.getUser()      //validates session against supa. auth server and takes out user(null if not logged in)
  return { supabase, user }
}

async function readTargetId(request: Request): Promise<string | null> {
  try {
    const body = await request.json()
    return typeof body?.targetId === "string" ? body.targetId : null     // ?. guards against body being null or undefined
  } catch {                                                              // the expression short-circuits to undefined
    return null                                                          // try-catch cant detect if the literal json is null or undefined
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const targetId = await readTargetId(request)
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 })

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId })     // inserted into the follower table
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFollow(user.id, targetId)
  return NextResponse.json({ ok: true })
}

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
