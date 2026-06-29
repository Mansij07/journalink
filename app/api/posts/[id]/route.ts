import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getPostById } from "@/lib/posts"
import { getProfileById } from "@/lib/profile"

/**
 * A single post with its author profile attached (for the full-post view).
 * The post row is Redis-cached (`post:{id}`); the author profile comes from the
 * separately cached `getProfileById` so profile edits reflect immediately.
 */
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

  const author = await getProfileById(supabase, post.author_id)

  return NextResponse.json({ ...post, profiles: author ?? null })
}
