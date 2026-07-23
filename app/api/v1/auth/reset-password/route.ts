import { NextResponse } from "next/server"

import { redis } from "@/lib/redis"
import { createAdminClient } from "@/lib/supabase/admin"

/** Apply a new password using a valid one-time reset token. */
export async function POST(request: Request) {
  let token: string
  let password: string
  try {
    const body = await request.json()
    token = String(body.token ?? "")
    password = String(body.password ?? "")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: "Missing reset token" }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    )
  }

  const key = `pwreset:${token}`

  let userId: string | null
  try {
    userId = await redis.get(key)
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }

  if (!userId) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    )
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) throw new Error(error.message)

    // Single-use: invalidate the token now that the password has changed.
    await redis.del(key)

    return NextResponse.json({ message: "Password updated successfully." })
  } catch (err) {
    console.error("reset-password error:", err)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
