import type { ApplicationStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Offered", // professor approved — awaiting the student's acceptance
  confirmed: "Joined", // student accepted the offer
  rejected: "Rejected",
  declined: "Declined", // student declined the offer
  left: "Left", // student left the project (prof-approved un-join)
}

/**
 * Color-coded status chip: Joined = green (success), Offered/Pending = yellow
 * (warning), Rejected/Declined = red (error), Left = neutral (secondary).
 */
const VARIANT: Record<ApplicationStatus, "success" | "warning" | "error" | "secondary"> = {
  confirmed: "success",
  accepted: "warning",
  pending: "warning",
  rejected: "error",
  declined: "error",
  left: "secondary",
}

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus
  className?: string
}) {
  return (
    <Badge variant={VARIANT[status]} className={cn("font-normal", className)}>
      {LABEL[status]}
    </Badge>
  )
}
