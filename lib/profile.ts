import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Profile } from "@/lib/types"
import { cacheGetOrSet, cacheDelete } from "@/lib/redis"

/** How long a cached profile row lives before being re-fetched (seconds). */

const PROFILE_TTL = 60 * 60 // 1 hour — profiles change rarely.

const profileIdKey = (id: string) => `profile:id:${id}`
const profileUsernameKey = (username: string) => `profile:username:${username}`

/**
 * Fetch a full profile row by id, served from Redis when available.
 *
 * Caches the entire row (`select("*")`), so callers that only need a field or
 * two (e.g. `role`, `year`) can still read from this single cache entry. Pass
 * the request-scoped Supabase client so RLS context is preserved on a miss.
 */
export async function getProfileById(
  supabase: SupabaseClient,     //RLS context is preserved on a miss
  id: string
): Promise<Profile | null> {
  return cacheGetOrSet(profileIdKey(id), PROFILE_TTL, async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    return (data as Profile | null) ?? null
  })
}

/**
 * Fetch a full profile row by username, served from Redis when available.
 * On a miss the row is cached under both the username key and its id key, so a
 * later id lookup hits cache too.
 */
export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<Profile | null> {
  return cacheGetOrSet(profileUsernameKey(username), PROFILE_TTL, async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)   
      .maybeSingle()
    const profile = (data as Profile | null) ?? null
    if (profile) {
      // Warm the id-keyed entry too so /feed-style lookups hit cache.
      await cacheGetOrSet(profileIdKey(profile.id), PROFILE_TTL, async () => profile)
    }
    return profile
  })
}

/**
 * Drop the cached copies of a profile. Call this after any write that changes
 * a profile row (e.g. the settings form save) so the next read is fresh.
 */
export async function invalidateProfile(
  id: string,
  username?: string | null   // ? makes the parameter optional
): Promise<void> {           // promise that resolves to nothing, only for deleting cache
  await cacheDelete(
    profileIdKey(id),
    ...(username ? [profileUsernameKey(username)] : [])      
  )
}

/**
 * A student must have a name, branch, and year before they can apply to
 * projects (year also drives the accept cap). Used to gate the Apply action.
 */
export function isProfileComplete(
  profile: Pick<Profile, "full_name" | "branch" | "year"> | null | undefined
): boolean {
  return Boolean(profile?.full_name && profile?.branch && profile?.year != null)
}

/**
 * Max number of projects a student may accept (confirm), by academic year:
 * 1st–3rd year → 1, 4th–5th → 2. Mirrors the server-side cap in
 * the `confirm_application` RPC.
 */
export function acceptCapForYear(year: number | null | undefined): number {
  if (year == null) return 1
  return year <= 3 ? 1 : 2
}
