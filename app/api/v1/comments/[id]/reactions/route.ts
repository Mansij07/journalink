import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Like/dislike counts for a comment + the current user's reaction. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [{ count: likes }, { count: dislikes }, { data: mine }] = await Promise.all([
    supabase
      .from("comment_reactions")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", id)
      .eq("value", "like"),
    supabase
      .from("comment_reactions")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", id)
      .eq("value", "dislike"),
    supabase
      .from("comment_reactions")
      .select("value")
      .eq("comment_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  return NextResponse.json({
    likes: likes ?? 0,
    dislikes: dislikes ?? 0,
    mine: (mine?.value as "like" | "dislike" | undefined) ?? null,
  })
}

/** Set (or switch) the current user's reaction on a comment. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { value?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (body.value !== "like" && body.value !== "dislike") {
    return NextResponse.json({ error: "value must be 'like' or 'dislike'" }, { status: 400 })
  }

  const { error } = await supabase
    .from("comment_reactions")
    .upsert(
      { comment_id: id, user_id: user.id, value: body.value },
      { onConflict: "comment_id,user_id" }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

/** Remove the current user's reaction from a comment. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("comment_reactions")
    .delete()
    .eq("comment_id", id)
    .eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
