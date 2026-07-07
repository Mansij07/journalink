import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { cacheGetOrSet, cacheDelete } from "@/lib/redis"

/** Counts change on follow/unfollow but are tolerable slightly stale → 10 min. */
const COUNT_TTL = 10 * 60
const SUGGESTIONS_TTL = 10 * 60

const followCountKey = (id: string) => `count:follow:${id}`
const projectCountKey = (id: string) => `count:projects:${id}`
const suggestionsKey = (userId: string) => `suggestions:${userId}`
const followingIdsKey = (id: string) => `following:ids:${id}`
const recentKey = (userId: string) => `recent:${userId}`
const mentionsKey = (userId: string) => `mentions:${userId}`

const RECENT_TTL = 10 * 60
const RECENT_LIMIT = 6
const MENTIONS_TTL = 10 * 60

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

/** The set of profile ids `userId` currently follows. Cached per-user. */
export async function getFollowingIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  return cacheGetOrSet(followingIdsKey(userId), COUNT_TTL, async () => {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
    return (data ?? []).map((r) => r.following_id)
  })
}

/** A profile usable as an @-mention target. */
export interface MentionCandidate {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

/**
 * Candidate pool for @-mention autocomplete: the profiles `userId` follows. The
 * client filters this by the typed query. Cached per-user (`mentions:{userId}`)
 * and busted by `invalidateFollow` when the follow set changes; a followed
 * user's rename goes slightly stale until the TTL — acceptable for autocomplete.
 */
export async function getMentionCandidates(
  supabase: SupabaseClient,
  userId: string
): Promise<MentionCandidate[]> {
  return cacheGetOrSet(mentionsKey(userId), MENTIONS_TTL, async () => {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
    const ids = (follows ?? []).map((f) => f.following_id)
    if (ids.length === 0) return []

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids)
    return (profiles as MentionCandidate[]) ?? []
  })
}

/**
 * The profiles who follow `userId` (their followers). Two queries (ids from
 * `follows`, then the profile rows) — no PostgREST embed — and uncached so the
 * list reflects follow/remove changes immediately.
 */
export async function getFollowersProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<Suggestion[]> {
  const { data: rows } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
  return profilesForIds(supabase, (rows ?? []).map((r) => r.follower_id))
}

/** The profiles `userId` follows. Same shape/approach as getFollowersProfiles. */
export async function getFollowingProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<Suggestion[]> {
  const { data: rows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
  return profilesForIds(supabase, (rows ?? []).map((r) => r.following_id))
}

/** Fetch the given profile ids as `Suggestion` rows (order not guaranteed). */
async function profilesForIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Suggestion[]> {
  if (ids.length === 0) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, avatar_url")
    .in("id", ids)
  return (data as Suggestion[]) ?? []
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
    suggestionsKey(followerId),
    followingIdsKey(followerId),
    mentionsKey(followerId)
  )
}

/** Bust a professor's project count (after create/delete of a project). */
export async function invalidateProjectCount(profId: string): Promise<void> {
  await cacheDelete(projectCountKey(profId))
}

/**
 * Profiles `userId` recently searched/viewed, most recent first. Redis-cached
 * per-user (`recent:{userId}`), busted on record/clear.
 */
export async function getRecentSearches(
  supabase: SupabaseClient,
  userId: string
): Promise<Suggestion[]> {
  return cacheGetOrSet(recentKey(userId), RECENT_TTL, async () => {
    const { data } = await supabase
      .from("recent_searches")
      .select(
        "viewed_id, created_at, profiles:viewed_id(id, username, role, full_name, avatar_url)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT)

    return (data ?? [])
      .map((row) => {
        const p = row.profiles as unknown as Suggestion | Suggestion[] | null
        return Array.isArray(p) ? p[0] : p
      })
      .filter((p): p is Suggestion => p != null)
  })
}

/** Record that `userId` viewed `viewedId` (upsert refreshes recency), bust cache. */
export async function recordRecentSearch(
  supabase: SupabaseClient,
  userId: string,
  viewedId: string
): Promise<void> {
  if (!viewedId || viewedId === userId) return
  const { error } = await supabase
    .from("recent_searches")
    .upsert(
      { user_id: userId, viewed_id: viewedId, created_at: new Date().toISOString() },
      { onConflict: "user_id,viewed_id" }
    )
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[recent_searches] upsert failed:", error.message)
  }
  await cacheDelete(recentKey(userId))
}

/** Clear all of `userId`'s recent searches, bust cache. */
export async function clearRecentSearches(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from("recent_searches").delete().eq("user_id", userId)
  await cacheDelete(recentKey(userId))
}
