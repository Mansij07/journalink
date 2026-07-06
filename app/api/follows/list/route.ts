import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getFollowersProfiles, getFollowingProfiles } from "@/lib/social"

/**
 * The followers / following list for a profile, used by the follow-list dialog.
 * `?userId=<profileId>&type=followers|following`. Any signed-in user may view
 * any profile's lists (reads only), matching the visible follow counts.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const type = searchParams.get("type")
  if (!userId || (type !== "followers" && type !== "following")) {
    return NextResponse.json({ error: "userId and type are required" }, { status: 400 })
  }

  const people =
    type === "followers"
      ? await getFollowersProfiles(supabase, userId)
      : await getFollowingProfiles(supabase, userId)

  return NextResponse.json({ people })
}
