import { Skeleton } from "@/components/ui/skeleton"

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="size-10 rounded-full shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0 pb-3">
            {/* Header row — name · @username · time (18px in PostCard) */}
            <div className="flex items-center gap-1.5 mb-2">
              <Skeleton className="h-[18px] w-32 rounded-full" />
              <Skeleton className="h-[18px] w-24 rounded-full hidden sm:block" />
              <Skeleton className="h-[18px] w-12 rounded-full" />
            </div>

            {/* Content lines */}
            <div className="flex flex-col gap-2 mb-3">
              <Skeleton className="h-3.5 w-full rounded-full" />
              <Skeleton className="h-3.5 w-[88%] rounded-full" />
              <Skeleton className="h-3.5 w-[70%] rounded-full" />
            </div>

            {/* Action bar — 5 buttons, matches max-w-[420px] in PostCard */}
            <div className="flex items-center justify-between max-w-[420px] -ml-2">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="size-9 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
