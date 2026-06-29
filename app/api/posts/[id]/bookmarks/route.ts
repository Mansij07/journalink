import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Whether the current user has bookmarked the post. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  return NextResponse.json({ bookmarked: !!data })
}

/** Bookmark the post as the current user. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("post_bookmarks")
    .insert({ post_id: id, user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

/** Remove the current user's bookmark. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("post_bookmarks")
    .delete()
    .eq("post_id", id)
    .eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
