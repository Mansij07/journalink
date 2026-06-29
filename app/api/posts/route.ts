import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { invalidateFeedAndAuthor } from "@/lib/posts"

/**
 * Create a post for the current user, then bust the feed + author caches.
 * Media is uploaded to Supabase Storage client-side; only the resulting URLs
 * are sent here.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { content?: unknown; media?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }
  const media = Array.isArray(body.media) ? body.media : undefined

  const { error } = await supabase.from("post").insert({
    content,
    author_id: user.id,
    category: "Announcement",
    ...(media && media.length > 0 ? { media } : {}),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFeedAndAuthor(user.id)
  return NextResponse.json({ ok: true })
}
