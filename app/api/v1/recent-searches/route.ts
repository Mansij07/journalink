import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  getRecentSearches,
  recordRecentSearch,
  clearRecentSearches,
} from "@/lib/social"

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** The current user's recent searches (most recent first). */
export async function GET() {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recent = await getRecentSearches(supabase, user.id)
  return NextResponse.json({ recent })
}

/** Record that the current user viewed `profileId`, then bust the recent cache. */
export async function POST(request: Request) {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let profileId: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.profileId === "string") profileId = body.profileId
  } catch {
    // fall through to the validation below
  }
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 })

  await recordRecentSearch(supabase, user.id, profileId)
  return NextResponse.json({ ok: true })
}

/** Clear all of the current user's recent searches. */
export async function DELETE() {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await clearRecentSearches(supabase, user.id)
  return NextResponse.json({ ok: true })
}
