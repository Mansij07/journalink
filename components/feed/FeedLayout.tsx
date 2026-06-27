"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { PostComposer } from "./PostComposer"
import { PostCard } from "./PostCard"
import { PostFullView } from "./PostFullView"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"
import { FeedSkeleton } from "./FeedSkeleton"
import { InfiniteScroll } from "./InfiniteScroll"

const BATCH_SIZE = 10

interface Suggestion {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface FeedLayoutProps {
  profile: any
  userId: string
  followersCount: number
  followingCount: number
  projectsCount: number
  suggestions: Suggestion[]
  followsYouIds: string[]
}

export function FeedLayout({ profile, userId, followersCount, followingCount, projectsCount, suggestions, followsYouIds }: FeedLayoutProps) {
  const [supabase] = useState(() => createClient())
  const activeTab = "all" as const
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const role = profile?.role || "Student"

  useEffect(() => {
    if (selectedPostId) return
    let cancelled = false

    const load = async () => {
      if (page === 0) setLoading(true)
      else setLoadingMore(true)

      const from = page * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      try {
        const { data: postRows, error } = await supabase
          .from("post")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to)

        if (error || !postRows) throw error

        const authorIds = [...new Set(postRows.map((p) => p.author_id))]
        const { data: profileRows } = authorIds.length
          ? await supabase.from("profiles").select("*").in("id", authorIds)
          : { data: [] }

        const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))
        const merged = postRows.map((p) => ({ ...p, profiles: profileMap.get(p.author_id) ?? null }))

        if (!cancelled) {
          setPosts((prev) => (page === 0 ? merged : [...prev, ...merged]))
          setHasMore(postRows.length === BATCH_SIZE)
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
  }, [activeTab, page, refreshKey, selectedPostId, userId, supabase])

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
    <div className="min-h-screen flex-1 bg-background text-foreground">
      <div className="mx-auto px-5 pt-6 pb-10" style={{ maxWidth: "1600px" }}>
        <div className="flex items-start gap-6">

          <aside
            className="hidden xl:block shrink-0 sticky top-6 overflow-y-auto"
            style={{ width: "260px", maxHeight: "calc(100vh - 1.5rem)" }}
          >
            <LeftSidebar
              profile={profile}
              followersCount={followersCount}
              followingCount={followingCount}
              projectsCount={projectsCount}
            />
          </aside>

          <main className="flex-1 min-w-0">
            {selectedPostId ? (
              <PostFullView
                postId={selectedPostId}
                userId={userId}
                role={role}
                onBack={() => setSelectedPostId(null)}
              />
            ) : (
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
                        <PostCard key={post.id} post={post} userId={userId} onPostClick={setSelectedPostId} />
                      ))}
                      {loadingMore && <FeedSkeleton count={2} />}
                    </InfiniteScroll>
                  )}
                </div>
              </div>
            )}
          </main>

          <aside
            className="hidden xl:block shrink-0 sticky top-6 overflow-y-auto"
            style={{ width: "260px", maxHeight: "calc(100vh - 1.5rem)" }}
          >
            <RightSidebar suggestions={suggestions} currentUserId={userId} followsYouIds={followsYouIds} />
          </aside>

        </div>
      </div>
    </div>
  )
}
