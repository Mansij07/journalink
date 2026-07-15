import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { cacheGetOrSet, ServiceUnavailableError } from "@/lib/redis"
import { rateLimit } from "@/lib/rateLimit"

const SEARCH_TTL = 2 * 60 // popular prefixes stay warm ~2 min

/** Typeahead over profiles. `?q=` is required; results are cached. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { allowed, retryAfterSeconds } = await rateLimit(`search:${user.id}`, 30, 60)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    )
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (!q) return NextResponse.json({ profiles: [] })

  try {
    const result = await cacheGetOrSet(
      `search:${q.toLowerCase()}`,
      SEARCH_TTL,
      async () => {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, role, avatar_url, full_name")
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(5)
        return { profiles: profiles ?? [] }
      }
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: { "Retry-After": "5" } })
    }
    throw err
  }
}
