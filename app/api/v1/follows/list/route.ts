import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getFollowersProfiles, getFollowingProfiles } from "@/lib/social"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)    // full incoming URL as a string, api/follows/list?userId=abc123&type=followers
  const userId = searchParams.get("userId")        // parses into a URL object, which breaks it into components.
  const type = searchParams.get("type")            // URLSearchParams instance built from the ?... portion of the URL
  if (!userId || (type !== "followers" && type !== "following")) {
    return NextResponse.json({ error: "userId and type are required" }, { status: 400 })
  }

  const people =
    type === "followers"
      ? await getFollowersProfiles(supabase, userId)
      : await getFollowingProfiles(supabase, userId)

  return NextResponse.json({ people })
}
