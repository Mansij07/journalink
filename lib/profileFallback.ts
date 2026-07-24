import type { Profile } from "@/lib/types"

/** Minimal stand-in for a user who is authenticated but has no `profiles` row yet. */
export function fallbackProfile(id: string): Profile {
  return {
    id,
    username: null,
    role: "Student",
    full_name: null,
    avatar_url: null,
    bio: null,
    branch: null,
    year: null,
    skills: null,
    links: null,
  }
}
