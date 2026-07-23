import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/** Number of unread notifications for the current user (for the nav badge). */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("read", false)

  return NextResponse.json({ count: count ?? 0 })
}
