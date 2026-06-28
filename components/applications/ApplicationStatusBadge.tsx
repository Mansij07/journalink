import type { ApplicationStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Offered", // professor approved — awaiting the student's acceptance
  confirmed: "Joined", // student accepted the offer
  rejected: "Rejected",
  declined: "Declined", // student declined the offer
}

/**
 * Achromatic status chip — distinguished by fill weight, not color, per the
 * monochrome design system. Joined = solid graphite, Offered = mist,
 * Pending = outline, Rejected/Declined = muted outline.
 */
export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  const variant =
    status === "confirmed"
      ? "default"
      : status === "accepted"
        ? "secondary"
        : "outline"

  const isNegative = status === "rejected" || status === "declined"

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-normal",
        isNegative && "text-muted-foreground",
        className
      )}
    >
      {LABEL[status]}
    </Badge>
  )
}
