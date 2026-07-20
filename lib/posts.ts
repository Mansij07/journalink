import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete, cacheDeleteByPrefix } from "@/lib/redis"

const FEED_BATCH_SIZE = 10
const AUTHOR_BATCH_SIZE = 5
const FEED_TTL = 45
const AUTHOR_POSTS_TTL = 5 * 60
const POST_TTL = 60 * 60 

const feedPageKey = (page: number) => `feed:page:${page}`
const authorPostsPageKey = (authorId: string, page: number, own: boolean) =>
  `posts:author:${authorId}:${own ? "own" : "page"}:${page}`
const postKey = (id: string) => `post:${id}`

type PostRow = { id: string; author_id: string; [key: string]: unknown }

export interface FeedPage {
  posts: PostRow[]
  hasMore: boolean
}

export async function getFeedPage(
  supabase: SupabaseClient,
  page: number
): Promise<FeedPage> {
  return cacheGetOrSet(feedPageKey(page), FEED_TTL, async () => {
    const from = page * FEED_BATCH_SIZE
    const to = from + FEED_BATCH_SIZE - 1

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

export async function getPostById(
  supabase: SupabaseClient,
  id: string
): Promise<PostRow | null> {
  return cacheGetOrSet(postKey(id), POST_TTL, async () => {
    const { data } = await supabase.from("post").select("*").eq("id", id).maybeSingle()
    return (data as PostRow | null) ?? null
  })
}

export async function invalidatePost(id: string): Promise<void> {
  await cacheDelete(postKey(id))
}

export async function invalidateFeedAndAuthor(authorId: string): Promise<void> {
  await cacheDeleteByPrefix("feed:page:")
  await cacheDeleteByPrefix(`posts:author:${authorId}:`)
}