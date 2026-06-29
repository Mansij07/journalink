import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getFeedPage } from "@/lib/posts"

/** One cached page of the global feed. `?page=` defaults to 0. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pageParam = new URL(request.url).searchParams.get("page")
  const page = Math.max(0, Number(pageParam) || 0)

  const feed = await getFeedPage(supabase, page)
  return NextResponse.json(feed)
}
