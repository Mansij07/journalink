import type { ApplicationStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const LABEL: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Offered", 
  confirmed: "Joined", 
  rejected: "Rejected",
  declined: "Declined", 
  left: "Left", 
}

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
