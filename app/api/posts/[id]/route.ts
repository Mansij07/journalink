import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getPostById, invalidateFeedAndAuthor } from "@/lib/posts"
import { getProfileById } from "@/lib/profile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const post = await getPostById(supabase, id)
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // A post scheduled for the future is only visible to its author.
  const scheduledAt = post.scheduled_at as string | null | undefined
  if (scheduledAt && Date.parse(scheduledAt) > Date.now() && post.author_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const author = await getProfileById(supabase, post.author_id)

  return NextResponse.json({ ...post, profiles: author ?? null })
}

/** Delete the current user's own post (used to undo a create). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("post")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) {
    return NextResponse.json(
      { error: "Post not found or you don't have permission to delete it." },
      { status: 404 }
    )
  }

  await invalidateFeedAndAuthor(user.id)
  return NextResponse.json({ ok: true })
}
