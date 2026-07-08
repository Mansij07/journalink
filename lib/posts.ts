import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete, cacheDeleteByPrefix } from "@/lib/redis"

const FEED_BATCH_SIZE = 10
const AUTHOR_BATCH_SIZE = 5 // profile posts load a small page at a time on scroll
const FEED_TTL = 45 // feed should feel fresh
const AUTHOR_POSTS_TTL = 5 * 60
const POST_TTL = 60 * 60 // a post's own content is effectively immutable

const feedPageKey = (page: number) => `feed:page:${page}`
const authorPostsPageKey = (authorId: string, page: number, own: boolean) =>
  `posts:author:${authorId}:${own ? "own" : "page"}:${page}`
const postKey = (id: string) => `post:${id}`

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

/**
 * One page of a single author's posts (newest first), with their profile
 * attached — for infinite scroll on profile pages. Same two-query approach as
 * `getFeedPage`: every post shares one author, so the profile is fetched once
 * and attached as `profiles` (the shape PostCard expects). When
 * `includeScheduled` is false (a non-owner viewer), future-scheduled posts are
 * hidden, mirroring the feed.
 */
export async function getAuthorPostsPage(
  supabase: SupabaseClient,
  authorId: string,
  page: number,
  includeScheduled: boolean
): Promise<FeedPage> {
  return cacheGetOrSet(
    authorPostsPageKey(authorId, page, includeScheduled),
    AUTHOR_POSTS_TTL,
    async () => {
      const from = page * AUTHOR_BATCH_SIZE
      const to = from + AUTHOR_BATCH_SIZE - 1

      let query = supabase
        .from("post")
        .select("*")
        .eq("author_id", authorId)
      if (!includeScheduled) {
        query = query.or(
          `scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`
        )
      }
      const { data: postRows, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error || !postRows) return { posts: [], hasMore: false }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authorId)
        .maybeSingle()

      const posts = postRows.map((p) => ({
        ...p,
        profiles: profileRow ?? null,
      }))
      return { posts, hasMore: postRows.length === AUTHOR_BATCH_SIZE }
    }
  )
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

/** Bust all feed pages and the author's paginated post lists after a new/changed post. */
export async function invalidateFeedAndAuthor(authorId: string): Promise<void> {
  await cacheDeleteByPrefix("feed:page:")
  await cacheDeleteByPrefix(`posts:author:${authorId}:`)
}
