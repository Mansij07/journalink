"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PostComposer } from "./PostComposer"
import { PostCard } from "./PostCard"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"
import { FeedSkeleton } from "./FeedSkeleton"
import { InfiniteScroll } from "./InfiniteScroll"
import { FeedShell } from "./FeedShell"

interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface FeedLayoutProps {
  // Loosely typed throughout the UI — shape varies by caller's query embed.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  profile: any
  userId: string
  followersCount: number
  followingCount: number
  projectsCount: number
  suggestions: Suggestion[]
  followsYouIds: string[]
  initialPosts: any[]
  /* eslint-enable @typescript-eslint/no-explicit-any */
  initialHasMore: boolean
}

export function FeedLayout({ profile, userId, followersCount, followingCount, projectsCount, suggestions, followsYouIds, initialPosts, initialHasMore }: FeedLayoutProps) {
  const activeTab = "all" as const
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>(initialPosts)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  // Page 0 is server-rendered/seeded — skip the initial client fetch.
  const seededRef = useRef(true)

  const role = profile?.role || "Student"

  useEffect(() => {
    if (seededRef.current && page === 0 && refreshKey === 0) {
      seededRef.current = false
      return
    }
    let cancelled = false

    const load = async () => {
      if (page === 0) setLoading(true)
      else setLoadingMore(true)

      try {
        const res = await fetch(`/api/feed?page=${page}`)
        if (!res.ok) throw new Error("feed fetch failed")
        const { posts: merged, hasMore: more } = await res.json()

        if (!cancelled) {
          setPosts((prev) => (page === 0 ? merged : [...prev, ...merged]))
          setHasMore(Boolean(more))
        }
      } catch {
        // keep current state on error
      }

      if (!cancelled) {
        setLoading(false)
        setLoadingMore(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [activeTab, page, refreshKey, userId])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) setPage((p) => p + 1)
  }, [loadingMore, loading, hasMore])

  const handlePostCreated = () => {
    setPage(0)
    setPosts([])
    setHasMore(true)
    setRefreshKey((k) => k + 1)
  }

  return (
    <FeedShell
      left={
        <LeftSidebar
          profile={profile}
          followersCount={followersCount}
          followingCount={followingCount}
          projectsCount={projectsCount}
        />
      }
      right={
        <RightSidebar suggestions={suggestions} currentUserId={userId} followsYouIds={followsYouIds} />
      }
    >
      <div className="flex flex-col pb-28">
        {role === "Prof" && (
          <PostComposer
            userId={userId}
            username={profile?.username}
            avatarUrl={profile?.avatar_url}
            onPostCreated={handlePostCreated}
          />
        )}

        <div className={role === "Prof" ? "mt-4" : ""}>
          {loading ? (
            <FeedSkeleton count={5} />
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-[15px]">No posts yet. Check back soon.</p>
            </div>
          ) : (
            <InfiniteScroll onLoadMore={handleLoadMore} hasMore={hasMore} loading={loadingMore}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} userId={userId} />
              ))}
              {loadingMore && <FeedSkeleton count={2} />}
            </InfiniteScroll>
          )}
        </div>
      </div>
    </FeedShell>
  )
}
