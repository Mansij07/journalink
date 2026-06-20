"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { FeedTabs } from "./FeedTabs"
import { PostComposer } from "./PostComposer"
import { PostCard } from "./PostCard"
import { PostFullView } from "./PostFullView"

interface FeedLayoutProps {
  role: string
  userId: string
}

export function FeedLayout({ role, userId }: FeedLayoutProps) {
  const [activeTab, setActiveTab] = useState<"all" | "following">("all")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPosts = async () => {
    setLoading(true)

    if (activeTab === "all") {
      const { data } = await supabase
        .from('post')
        .select('*, profiles!author_id(username, role)')
        .order('created_at', { ascending: false })
      
      setPosts(data || [])
    } else {
      // following tab
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (followsError || !follows || follows.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const followedIds = follows.map(f => f.following_id)
      
      if (followedIds.length > 0) {
        const { data } = await supabase
          .from('post')
          .select('*, profiles!author_id(username, role)')
          .in('author_id', followedIds)
          .order('created_at', { ascending: false })
          
        setPosts(data || [])
      } else {
        setPosts([])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    // Only fetch if we are not looking at a full post
    if (!selectedPostId) {
      fetchPosts()
    }
  }, [activeTab, selectedPostId])

  return (
    <div className="flex min-h-screen bg-[var(--background)] justify-center">
      {/* Left Column - empty space */}
      <div className="w-64 hidden md:block" />

      {/* Center Column - feed content */}
      <div className="flex-1 max-w-2xl w-full border-x border-white/10 flex flex-col min-h-screen">
        {selectedPostId ? (
          <PostFullView 
            postId={selectedPostId} 
            userId={userId} 
            role={role} 
            onBack={() => setSelectedPostId(null)} 
          />
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-md">
              <h2 className="font-semibold text-lg px-4 py-3 border-b border-white/10">Home</h2>
              {role === "Prof" && (
                <PostComposer userId={userId} onPostCreated={fetchPosts} />
              )}
              <FeedTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div className="flex-1 pb-20">
              {loading ? (
                <p className="text-white/30 text-sm text-center py-8">Loading...</p>
              ) : posts.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">
                  {activeTab === "all" ? "No posts yet. Check back soon." : "You're not following anyone yet."}
                </p>
              ) : (
                posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onPostClick={setSelectedPostId} 
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Column - empty space */}
      <div className="w-80 hidden md:block" />
    </div>
  )
}
