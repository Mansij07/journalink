import { Skeleton } from "@/components/ui/skeleton"

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 flex gap-3"
        >
          <Skeleton className="size-10 rounded-full shrink-0 mt-0.5" />

          <div className="flex-1 flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </div>

            <Skeleton className="h-3.5 w-full rounded-full" />
            <Skeleton className="h-3.5 w-[88%] rounded-full" />
            <Skeleton className="h-3.5 w-[70%] rounded-full" />

            <div className="flex items-center justify-between max-w-[360px] pt-1">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="size-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
