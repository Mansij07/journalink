import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import {
  NotificationList,
  type NotificationItem,
} from "@/components/notifications/NotificationList"

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, read, created_at, post_id, project_id, application_id, actor:profiles!actor_id ( id, username, full_name, avatar_url )"
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activity on your posts, projects, and applications.
          </p>
        </div>

        <NotificationList
          initial={(data as unknown as NotificationItem[]) ?? []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
