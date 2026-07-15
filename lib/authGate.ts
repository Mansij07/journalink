import "server-only"

/** Paths reachable without a session — auth flows plus the custom password-reset pages. */
const PUBLIC_UNAUTHENTICATED_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
]

export interface ProfileRow {
  username: string | null
  role: string | null
}

export interface GateUser {
  email?: string | null
  app_metadata?: { provider?: string } | null
}

/**
 * A profile is "onboarded" once it has a real username and role. Email/password
 * signups collect both at signup time, so any profile row for them counts as
 * complete. OAuth signups get an auto-created row (username defaulted to the
 * email's local part, role null) and must go through /onboarding to replace it.
 */
export function isOnboardingComplete(
  profile: ProfileRow | null | undefined,
  user: GateUser
): boolean {
  if (!profile) return false
  const isOAuthUser = user.app_metadata?.provider !== "email"
  if (!isOAuthUser) return true
  return profile.username !== user.email?.split("@")[0] && profile.role !== null
}

export interface AuthGateInput {
  path: string
  isAuthenticated: boolean
  onboardingComplete: boolean
}

/**
 * Pure routing decision for the auth/onboarding gate: given where a request is
 * headed and the caller's auth/onboarding state, returns the path to redirect
 * to, or `null` to let the request through unchanged. Kept free of Next.js/
 * Supabase types so it's unit-testable without mocking either.
 */
export function resolveGateRedirect({
  path,
  isAuthenticated,
  onboardingComplete,
}: AuthGateInput): string | null {
  if (!isAuthenticated) {
    const isPublic = PUBLIC_UNAUTHENTICATED_PREFIXES.some((p) => path.startsWith(p))
    return isPublic ? null : "/login"
  }

  if (!onboardingComplete) {
    const isOnboardingFlow = path.startsWith("/onboarding") || path.startsWith("/auth")
    return isOnboardingFlow ? null : "/onboarding"
  }

  const isAuthPage =
    path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/onboarding")
  return isAuthPage ? "/feed" : null
}
