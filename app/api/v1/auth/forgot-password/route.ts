import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

import { redis } from "@/lib/redis"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPasswordResetEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rateLimit"
import { logger } from "@/lib/logger"

const TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * Generic success used for every outcome where the email is/was valid, so the
 * response never reveals whether an account exists for a given address. Returns
 * a fresh response each call — a NextResponse body can only be consumed once, so
 * a shared instance would come back empty on the second request.
 */
const genericOk = () =>
  NextResponse.json({
    message: "If an account exists for that email, a reset link is on its way.",
  })

/** Request a password reset: emails a one-time reset link via Resend. */
export async function POST(request: Request) {
  let email: string
  try {
    const body = await request.json()
    email = String(body.email ?? "").trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Keyed by the target email (not the caller) — the goal is to stop one
  // address from being email-bombed, regardless of how many IPs request it.
  const { allowed } = await rateLimit(`pwreset-request:${email}`, 5, 15 * 60)
  if (!allowed) {
    // Same generic response as every other outcome — a 429 here would leak
    // that this email has been requested repeatedly.
    return genericOk()
  }

  try {
    const admin = createAdminClient()

    // Find the user by email. listUsers is paginated; the first page is enough
    // for typical sizes and avoids leaking existence via a targeted query.
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw new Error(error.message)

    const user = data.users.find((u) => u.email?.toLowerCase() === email)

    // No such user → respond generically without sending anything.
    if (!user) return genericOk()

    const token = randomUUID()
    await redis.set(`pwreset:${token}`, user.id, "EX", TOKEN_TTL_SECONDS)

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    await sendPasswordResetEmail(email, resetUrl)

    return genericOk()
  } catch (err) {
    logger.error("forgot-password failed", { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
