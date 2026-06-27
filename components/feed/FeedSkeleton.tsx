export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="mb-4 rounded-2xl border border-[#2F3336] bg-[#16181C] p-5 animate-pulse flex gap-3"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#2F3336] shrink-0 mt-0.5" />

          <div className="flex-1 space-y-3 pt-1">
            {/* Author row */}
            <div className="flex items-center gap-2">
              <div className="h-3 bg-[#2F3336] rounded-full w-28" />
              <div className="h-3 bg-[#2F3336] rounded-full w-20" />
              <div className="h-3 bg-[#2F3336] rounded-full w-10" />
            </div>

            {/* Content lines */}
            <div className="h-3.5 bg-[#2F3336] rounded-full w-full" />
            <div className="h-3.5 bg-[#2F3336] rounded-full w-[88%]" />
            <div className="h-3.5 bg-[#2F3336] rounded-full w-[70%]" />

            {/* Engagement row */}
            <div className="flex items-center justify-between max-w-[360px] pt-1">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="w-8 h-8 rounded-full bg-[#2F3336]" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
