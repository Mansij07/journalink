import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { FeedSkeleton } from "@/components/feed/FeedSkeleton"

/**
 * Shown instantly on navigation to a profile while the server component (follow
 * counts, projects, posts, …) resolves — so a skeleton is visible before the
 * posts load, matching the feed's loading treatment.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        {/* Header */}
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="mt-4 h-9 w-64 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-32 rounded-full" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <div className="mt-4 flex gap-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        <Separator className="my-8" />

        {/* Posts */}
        <Skeleton className="mb-4 h-6 w-24 rounded-lg" />
        <FeedSkeleton count={3} />
      </div>
    </div>
  )
}
