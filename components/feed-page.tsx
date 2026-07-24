"use client"

import { FeedLayout } from "@/components/feed/FeedLayout"
import type { Profile, FeedPost } from "@/lib/types"

interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface FeedClientProps {
  profile: Profile | null
  userId: string
  followersCount: number
  followingCount: number
  projectsCount: number
  suggestions: Suggestion[]
  followsYouIds: string[]
  initialPosts: FeedPost[]
  initialHasMore: boolean
}

export function FeedClient({
  profile,
  userId,
  followersCount,
  followingCount,
  projectsCount,
  suggestions,
  followsYouIds,
  initialPosts,
  initialHasMore,
}: FeedClientProps) {
  return (
    <FeedLayout
      profile={profile}
      userId={userId}
      followersCount={followersCount}
      followingCount={followingCount}
      projectsCount={projectsCount}
      suggestions={suggestions}
      followsYouIds={followsYouIds}
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
    />
  )
}
