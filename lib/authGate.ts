import "server-only"

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
