import { FeedClient } from "@/components/feed-page"
import { createClient } from "@/lib/supabase/server"
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
    { data: profile },
    { count: followersCount },
    { count: followingCount },
    { count: projectsCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
    supabase
      .from("project")
      .select("*", { count: "exact", head: true })
      .eq("professor_id", user.id),
  ])

  // Fetch IDs the current user already follows
  const { data: alreadyFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)

  const excludeIds = [user.id, ...(alreadyFollowing?.map((f) => f.following_id) ?? [])]

  // Suggested profiles: not already followed, not self, Professors first
  const { data: suggestions } = await supabase
    .from("profiles")
    .select("*")
    .not("id", "in", `(${excludeIds.join(",")})`)
    .order("role", { ascending: true }) // "Prof" < "Student" alphabetically → Profs first
    .limit(6)

  // Which of the suggestions already follow the current user (for "Follow Back")
  const suggestionIds = (suggestions ?? []).map((s) => s.id)
  const { data: followsYouRows } = suggestionIds.length
    ? await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .in("follower_id", suggestionIds)
    : { data: [] }
  const followsYouIds = (followsYouRows ?? []).map((r) => r.follower_id)

  return (
    <FeedClient
      profile={profile ?? { id: user.id, role: "Student" }}
      userId={user.id}
      followersCount={followersCount ?? 0}
      followingCount={followingCount ?? 0}
      projectsCount={projectsCount ?? 0}
      suggestions={suggestions ?? []}
      followsYouIds={followsYouIds}
    />
  )
}
