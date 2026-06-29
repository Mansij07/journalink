import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getProfileById } from "@/lib/profile"
import { getFollowCounts, getProjectCount, getSuggestions } from "@/lib/social"
import { PostFullView } from "@/components/feed/PostFullView"
import { FeedShell } from "@/components/feed/FeedShell"
import { LeftSidebar } from "@/components/feed/LeftSidebar"
import { RightSidebar } from "@/components/feed/RightSidebar"

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [profile, { followers, following }, projectsCount, { suggestions, followsYouIds }] =
    await Promise.all([
      getProfileById(supabase, user.id),
      getFollowCounts(supabase, user.id),
      getProjectCount(supabase, user.id),
      getSuggestions(supabase, user.id),
    ])

  return (
    <FeedShell
      left={
        <LeftSidebar
          profile={profile ?? { id: user.id, role: "Student" }}
          followersCount={followers}
          followingCount={following}
          projectsCount={projectsCount}
        />
      }
      right={
        <RightSidebar
          suggestions={suggestions}
          currentUserId={user.id}
          followsYouIds={followsYouIds}
        />
      }
    >
      <PostFullView postId={id} userId={user.id} />
    </FeedShell>
  )
}
