import { FeedClient } from "@/components/feed-page"
import { createClient } from "@/lib/supabase/server"
import { getProfileById } from "@/lib/profile"
import { getFollowCounts, getProjectCount, getSuggestions } from "@/lib/social"
import { getFeedPage } from "@/lib/posts"
import { redirect } from "next/navigation"

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [
    profile,
    { followers, following },
    projectsCount,
    { suggestions, followsYouIds },
    { posts: initialPosts, hasMore: initialHasMore },
  ] = await Promise.all([
    getProfileById(supabase, user.id),
    getFollowCounts(supabase, user.id),
    getProjectCount(supabase, user.id),
    getSuggestions(supabase, user.id),
    // First feed page, server-rendered (Redis-cached) so posts paint immediately.
    getFeedPage(supabase, 0),
  ])

  return (
    <FeedClient
      profile={profile ?? { id: user.id, role: "Student" }}
      userId={user.id}
      followersCount={followers}
      followingCount={following}
      projectsCount={projectsCount}
      suggestions={suggestions}
      followsYouIds={followsYouIds}
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
    />
  )
}
