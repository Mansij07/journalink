import { Skeleton } from "@/components/ui/skeleton"
import { FeedSkeleton } from "./FeedSkeleton"

/** Loading placeholder for the single-post page: the post + a replies card. */
export function PostSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* The post itself */}
      <FeedSkeleton count={1} />

      {/* Replies card — mirrors the real layout in PostFullView */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-border px-4 py-4 last:border-b-0">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-3.5 w-[80%] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
