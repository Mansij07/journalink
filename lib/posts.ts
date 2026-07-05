import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete, cacheDeleteByPrefix } from "@/lib/redis"

const FEED_BATCH_SIZE = 10
const FEED_TTL = 45 // feed should feel fresh
const AUTHOR_POSTS_TTL = 5 * 60
const POST_TTL = 60 * 60 // a post's own content is effectively immutable

const feedPageKey = (page: number) => `feed:page:${page}`
const authorPostsKey = (authorId: string) => `posts:author:${authorId}`
const postKey = (id: string) => `post:${id}`

const AUTHOR_JOIN = "*, profiles!author_id ( id, username, full_name, avatar_url, role )"

// Posts are loosely shaped throughout the UI (PostCard takes `post: any`).
type PostRow = { id: string; author_id: string; [key: string]: unknown }

export interface FeedPage {
  posts: PostRow[]
  hasMore: boolean
}

/**
 * One page of the global feed (newest first), with each post's author profile
 * attached. Mirrors the two-query approach the client used, but cached under a
 * global key since the feed is not personalized.
 */
export async function getFeedPage(
  supabase: SupabaseClient,
  page: number
): Promise<FeedPage> {
  return cacheGetOrSet(feedPageKey(page), FEED_TTL, async () => {
    const from = page * FEED_BATCH_SIZE
    const to = from + FEED_BATCH_SIZE - 1

    // Hide posts scheduled for the future; unscheduled posts have scheduled_at null.
    const { data: postRows, error } = await supabase
      .from("post")
      .select("*")
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error || !postRows) return { posts: [], hasMore: false }

    const authorIds = [...new Set(postRows.map((p) => p.author_id))]
    const { data: profileRows } = authorIds.length
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] }

    const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))
    const posts = postRows.map((p) => ({
      ...p,
      profiles: profileMap.get(p.author_id) ?? null,
    }))

    return { posts, hasMore: postRows.length === FEED_BATCH_SIZE }
  })
}

/** A single author's latest posts (with their profile joined), for profile pages. */
export async function getAuthorPosts(
  supabase: SupabaseClient,
  authorId: string
): Promise<PostRow[]> {
  return cacheGetOrSet(authorPostsKey(authorId), AUTHOR_POSTS_TTL, async () => {
    const { data } = await supabase
      .from("post")
      .select(AUTHOR_JOIN)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .limit(20)
    return (data as PostRow[]) ?? []
  })
}

/**
 * A single post's own row (content/media/author_id), cached. The author profile
 * is intentionally NOT embedded here — callers attach it via the separately
 * cached `getProfileById`, so profile edits show up immediately. Comments are
 * never cached (they stay live).
 */
export async function getPostById(
  supabase: SupabaseClient,
  id: string
): Promise<PostRow | null> {
  return cacheGetOrSet(postKey(id), POST_TTL, async () => {
    const { data } = await supabase.from("post").select("*").eq("id", id).maybeSingle()
    return (data as PostRow | null) ?? null
  })
}

/** Bust a single post's cached row (call on post edit/delete). */
export async function invalidatePost(id: string): Promise<void> {
  await cacheDelete(postKey(id))
}

/** Bust all feed pages and the author's post list after a new/changed post. */
export async function invalidateFeedAndAuthor(authorId: string): Promise<void> {
  await cacheDeleteByPrefix("feed:page:")
  await cacheDelete(authorPostsKey(authorId))
}
