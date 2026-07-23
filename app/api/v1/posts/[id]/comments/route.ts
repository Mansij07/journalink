import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Comments on a post (oldest first), each with its author profile. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Lightweight mode for the reply-count badge.
  if (new URL(request.url).searchParams.get("countOnly")) {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id)
    return NextResponse.json({ count: count ?? 0 })
  }

  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!comments || comments.length === 0) return NextResponse.json({ comments: [] })

  const authorIds = [...new Set(comments.map((c) => c.author_id))]
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", authorIds)
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  return NextResponse.json({
    comments: comments.map((c) => ({ ...c, profiles: profileMap.get(c.author_id) ?? null })),
  })
}

/** Add a comment to a post as the current user. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { content?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 })

  const { error } = await supabase
    .from("comments")
    .insert({ post_id: id, content, author_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
