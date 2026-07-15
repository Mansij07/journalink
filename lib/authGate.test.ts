import { describe, it, expect } from "vitest"

import { isOnboardingComplete, resolveGateRedirect } from "@/lib/authGate"

describe("isOnboardingComplete", () => {
  it("is false when there's no profile row yet", () => {
    expect(
      isOnboardingComplete(null, { email: "a@b.com", app_metadata: { provider: "email" } })
    ).toBe(false)
  })

  it("is true for email/password users as soon as a profile row exists", () => {
    expect(
      isOnboardingComplete(
        { username: "whatever", role: null },
        { email: "a@b.com", app_metadata: { provider: "email" } }
      )
    ).toBe(true)
  })

  it("is false for OAuth users still on the auto-generated username with a null role", () => {
    expect(
      isOnboardingComplete(
        { username: "a", role: null },
        { email: "a@b.com", app_metadata: { provider: "google" } }
      )
    ).toBe(false)
  })

  it("is true for OAuth users once they've picked a username and a role", () => {
    expect(
      isOnboardingComplete(
        { username: "chosen-name", role: "Student" },
        { email: "a@b.com", app_metadata: { provider: "google" } }
      )
    ).toBe(true)
  })
})

describe("resolveGateRedirect", () => {
  it("sends unauthenticated visitors to /login, except on public auth paths", () => {
    expect(
      resolveGateRedirect({ path: "/feed", isAuthenticated: false, onboardingComplete: false })
    ).toBe("/login")
    expect(
      resolveGateRedirect({ path: "/login", isAuthenticated: false, onboardingComplete: false })
    ).toBeNull()
    expect(
      resolveGateRedirect({
        path: "/forgot-password",
        isAuthenticated: false,
        onboardingComplete: false,
      })
    ).toBeNull()
  })

  it("sends authenticated-but-not-onboarded users to /onboarding", () => {
    expect(
      resolveGateRedirect({ path: "/feed", isAuthenticated: true, onboardingComplete: false })
    ).toBe("/onboarding")
    expect(
      resolveGateRedirect({ path: "/onboarding", isAuthenticated: true, onboardingComplete: false })
    ).toBeNull()
  })

  it("sends fully onboarded users away from login/signup/onboarding to /feed", () => {
    expect(
      resolveGateRedirect({ path: "/login", isAuthenticated: true, onboardingComplete: true })
    ).toBe("/feed")
    expect(
      resolveGateRedirect({ path: "/signup", isAuthenticated: true, onboardingComplete: true })
    ).toBe("/feed")
    expect(
      resolveGateRedirect({ path: "/onboarding", isAuthenticated: true, onboardingComplete: true })
    ).toBe("/feed")
  })

  it("lets fully onboarded users through to normal app pages", () => {
    expect(
      resolveGateRedirect({ path: "/feed", isAuthenticated: true, onboardingComplete: true })
    ).toBeNull()
    expect(
      resolveGateRedirect({ path: "/projects/42", isAuthenticated: true, onboardingComplete: true })
    ).toBeNull()
  })
})
