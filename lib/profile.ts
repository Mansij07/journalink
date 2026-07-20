import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Profile } from "@/lib/types"
import { cacheGetOrSet, cacheDelete } from "@/lib/redis"

const PROFILE_TTL = 60 * 60

const profileIdKey = (id: string) => `profile:id:${id}`
const profileUsernameKey = (username: string) => `profile:username:${username}`

export async function getProfileById(
  supabase: SupabaseClient,     
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
      await cacheGetOrSet(profileIdKey(profile.id), PROFILE_TTL, async () => profile)
    }
    return profile
  })
}

export async function invalidateProfile(
  id: string,
  username?: string | null   
): Promise<void> {           
  await cacheDelete(
    profileIdKey(id),
    ...(username ? [profileUsernameKey(username)] : [])      
  )
}

export function isProfileComplete(
  profile: Pick<Profile, "full_name" | "branch" | "year"> | null | undefined
): boolean {
  return Boolean(profile?.full_name && profile?.branch && profile?.year != null)
}

export function acceptCapForYear(year: number | null | undefined): number {
  if (year == null) return 1
  return year <= 3 ? 1 : 2
}
