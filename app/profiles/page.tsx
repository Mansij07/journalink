import { redirect } from "next/navigation"

import { ProfileClient } from "@/components/profiles-page"
import { createClient } from "@/lib/supabase/server"
import { getSuggestions, getRecentSearches, getFollowingIds } from "@/lib/social"

export default async function profilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ suggestions, followsYouIds }, recent, followingIds] = await Promise.all([
    getSuggestions(supabase, user.id),
    getRecentSearches(supabase, user.id),
    getFollowingIds(supabase, user.id),
  ])

  return (
    <ProfileClient
      suggestions={suggestions}
      followsYouIds={followsYouIds}
      recent={recent}
      followingIds={followingIds}
      currentUserId={user.id}
    />
  )
}
