"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PostComposer } from "./PostComposer"
import { PostCard } from "./PostCard"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"
import { FeedSkeleton } from "./FeedSkeleton"
import { InfiniteScroll } from "./InfiniteScroll"
import { FeedShell } from "./FeedShell"
import type { Profile, FeedPost } from "@/lib/types"

interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface FeedLayoutProps {
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

export function FeedLayout({ profile, userId, followersCount, followingCount, projectsCount, suggestions, followsYouIds, initialPosts, initialHasMore }: FeedLayoutProps) {
  const activeTab = "all" as const
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [serviceError, setServiceError] = useState<number | null>(null)
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

        if (res.status === 503) {
          const retryAfter = Number(res.headers.get("Retry-After")) || 5
          if (!cancelled) setServiceError(retryAfter)
        } else if (!res.ok) {
          throw new Error("feed fetch failed")
        } else {
          const { posts: merged, hasMore: more } = await res.json()
          if (!cancelled) {
            setServiceError(null)
            setPosts((prev) => (page === 0 ? merged : [...prev, ...merged]))
            setHasMore(Boolean(more))
          }
        }
      } catch {
      }

      if (!cancelled) {
        setLoading(false)
        setLoadingMore(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [activeTab, page, refreshKey, userId])

  useEffect(() => {
    if (serviceError == null) return
    const timer = setTimeout(() => setRefreshKey((k) => k + 1), serviceError * 1000)
    return () => clearTimeout(timer)
  }, [serviceError])

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
            username={profile?.username ?? undefined}
            avatarUrl={profile?.avatar_url}
            onPostCreated={handlePostCreated}
          />
        )}

        <div className={role === "Prof" ? "mt-4" : ""}>
          {serviceError != null && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              Feed is temporarily unavailable. Retrying in {serviceError}s…
            </div>
          )}
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
