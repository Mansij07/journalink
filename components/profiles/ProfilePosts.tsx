"use client"

import * as React from "react"

import { PostCard } from "@/components/feed/PostCard"
import { InfiniteScroll } from "@/components/feed/InfiniteScroll"
import { FeedSkeleton } from "@/components/feed/FeedSkeleton"
import type { FeedPost } from "@/lib/types"

/**
 * A professor's posts, loaded one page at a time as the viewer scrolls (via the
 * shared [InfiniteScroll] sentinel) so the DB isn't hit for the whole list at
 * once. Seeded with the server-rendered first page.
 */
export function ProfilePosts({
  authorId,
  viewerId,
  initialPosts,
  initialHasMore,
}: {
  authorId: string
  viewerId: string
  initialPosts: FeedPost[]
  initialHasMore: boolean
}) {
  const [posts, setPosts] = React.useState<FeedPost[]>(initialPosts)
  const [page, setPage] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(initialHasMore)
  const [loadingMore, setLoadingMore] = React.useState(false)

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    try {
      const res = await fetch(`/api/posts?author=${authorId}&page=${next}`)
      if (!res.ok) throw new Error("posts fetch failed")
      const { posts: more, hasMore: moreLeft } = await res.json()
      setPosts((prev) => [...prev, ...(more as FeedPost[])])
      setHasMore(Boolean(moreLeft))
      setPage(next)
    } catch {
      // Keep current posts on error; the sentinel can retry on the next scroll.
    } finally {
      setLoadingMore(false)
    }
  }, [authorId, page, hasMore, loadingMore])

  if (posts.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">No posts yet.</p>
    )
  }

  return (
    <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore} loading={loadingMore}>
      {/* Rendered directly (like the feed) — no count-keyed stagger reveal, which
          would re-hide already-visible cards each time a new page appends. */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} userId={viewerId} />
      ))}
      {loadingMore && (
        <div className="mt-4">
          <FeedSkeleton count={2} />
        </div>
      )}
    </InfiniteScroll>
  )
}
