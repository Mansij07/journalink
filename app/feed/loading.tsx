import { FeedSkeleton } from "@/components/feed/FeedSkeleton"

export default function FeedLoading() {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 py-6">
      <FeedSkeleton count={5} />
    </div>
  )
}
