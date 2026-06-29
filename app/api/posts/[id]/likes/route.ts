import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Like count for the post + whether the current user has liked it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [{ count }, { data: mine }] = await Promise.all([
    supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ])
  return NextResponse.json({ count: count ?? 0, liked: !!mine })
}

/** Like the post as the current user. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: id, user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

/** Remove the current user's like. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", id)
    .eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
