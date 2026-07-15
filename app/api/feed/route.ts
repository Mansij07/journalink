import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getFeedPage } from "@/lib/posts"
import { ServiceUnavailableError } from "@/lib/redis"

/** One cached page of the global feed. `?page=` defaults to 0. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pageParam = new URL(request.url).searchParams.get("page")
  const page = Math.max(0, Number(pageParam) || 0)

  try {
    const feed = await getFeedPage(supabase, page)
    return NextResponse.json(feed)
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: { "Retry-After": "5" } })
    }
    throw err
  }
}
