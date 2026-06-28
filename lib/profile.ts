import type { Profile } from "@/lib/types"

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
