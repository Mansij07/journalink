import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete } from "@/lib/redis"

/** Counts change on follow/unfollow but are tolerable slightly stale → 10 min. */
const COUNT_TTL = 10 * 60
const SUGGESTIONS_TTL = 10 * 60

const followCountKey = (id: string) => `count:follow:${id}`
const projectCountKey = (id: string) => `count:projects:${id}`
const suggestionsKey = (userId: string) => `suggestions:${userId}`

export interface FollowCounts {
  followers: number
  following: number
}

/** Followers (people following `id`) and following (people `id` follows). */
export async function getFollowCounts(
  supabase: SupabaseClient,
  id: string
): Promise<FollowCounts> {
  return cacheGetOrSet(followCountKey(id), COUNT_TTL, async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", id),
    ])
    return { followers: followers ?? 0, following: following ?? 0 }
  })
}

/** How many projects a professor owns. */
export async function getProjectCount(
  supabase: SupabaseClient,
  id: string
): Promise<number> {
  return cacheGetOrSet(projectCountKey(id), COUNT_TTL, async () => {
    const { count } = await supabase
      .from("project")
      .select("*", { count: "exact", head: true })
      .eq("professor_id", id)
    return count ?? 0
  })
}

/** Shape consumed by the "Who to follow" sidebar. */
export interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

export interface SuggestionsResult {
  suggestions: Suggestion[]
  followsYouIds: string[]
}

/**
 * "Who to follow" for `userId`: profiles they don't already follow (Professors
 * first), plus which of those already follow the user (for "Follow Back").
 * Per-user — keyed by `userId`.
 */
export async function getSuggestions(
  supabase: SupabaseClient,
  userId: string
): Promise<SuggestionsResult> {
  return cacheGetOrSet(suggestionsKey(userId), SUGGESTIONS_TTL, async () => {
    const { data: alreadyFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)

    const excludeIds = [
      userId,
      ...(alreadyFollowing?.map((f) => f.following_id) ?? []),
    ]

    const { data: suggestions } = await supabase
      .from("profiles")
      .select("*")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("role", { ascending: true }) // "Prof" < "Student" → Profs first
      .limit(6)

    const suggestionIds = (suggestions ?? []).map((s) => s.id)
    const { data: followsYouRows } = suggestionIds.length
      ? await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId)
          .in("follower_id", suggestionIds)
      : { data: [] }

    return {
      suggestions: (suggestions as Suggestion[]) ?? [],
      followsYouIds: (followsYouRows ?? []).map((r) => r.follower_id),
    }
  })
}

/**
 * Bust caches affected when `followerId` (un)follows `followingId`: both users'
 * follow counts, and the follower's suggestion list (the target leaves/returns).
 */
export async function invalidateFollow(
  followerId: string,
  followingId: string
): Promise<void> {
  await cacheDelete(
    followCountKey(followerId),
    followCountKey(followingId),
    suggestionsKey(followerId)
  )
}

/** Bust a professor's project count (after create/delete of a project). */
export async function invalidateProjectCount(profId: string): Promise<void> {
  await cacheDelete(projectCountKey(profId))
}
