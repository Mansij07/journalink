import { FeedSkeleton } from "@/components/feed/FeedSkeleton"

/**
 * Shown instantly on navigation to /feed while the server render (which now
 * includes the first feed page) resolves — a skeleton is visible before posts.
 */
export default function FeedLoading() {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-6">
      <FeedSkeleton count={5} />
    </div>
  )
}
