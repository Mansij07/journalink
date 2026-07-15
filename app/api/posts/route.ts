import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getAuthorPostsPage, invalidateFeedAndAuthor } from "@/lib/posts"
import { rateLimit } from "@/lib/rateLimit"

/** One cached page of a single author's posts. `?author=` required, `?page=` defaults to 0. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const author = url.searchParams.get("author")
  if (!author) return NextResponse.json({ error: "author required" }, { status: 400 })
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0)

  // Only the author sees their own future-scheduled posts.
  const includeScheduled = author === user.id
  const result = await getAuthorPostsPage(supabase, author, page, includeScheduled)
  return NextResponse.json(result)
}

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

  const { allowed, retryAfterSeconds } = await rateLimit(`posts:create:${user.id}`, 10, 5 * 60)
  if (!allowed) {
    return NextResponse.json(
      { error: "You're posting too fast. Please wait a bit." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    )
  }

  let body: { content?: unknown; media?: unknown; scheduledAt?: unknown }
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

  // Optional schedule: post is inserted now but stays hidden from feeds until
  // scheduled_at passes (enforced in lib/posts + the single-post route).
  let scheduledAt: string | null = null
  if (typeof body.scheduledAt === "string" && body.scheduledAt) {
    const t = Date.parse(body.scheduledAt)
    if (Number.isNaN(t)) {
      return NextResponse.json({ error: "Invalid schedule time" }, { status: 400 })
    }
    if (t <= Date.now()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 })
    }
    scheduledAt = new Date(t).toISOString()
  }

  const { data, error } = await supabase
    .from("post")
    .insert({
      content,
      author_id: user.id,
      category: "Announcement",
      ...(media && media.length > 0 ? { media } : {}),
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await invalidateFeedAndAuthor(user.id)
  return NextResponse.json({ id: data.id })
}
