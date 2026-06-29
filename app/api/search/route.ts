import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { cacheGetOrSet } from "@/lib/redis"

const SEARCH_TTL = 2 * 60 // popular prefixes stay warm ~2 min

/** Typeahead over profiles + projects. `?q=` is required; results are cached. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (!q) return NextResponse.json({ profiles: [], projects: [] })

  const result = await cacheGetOrSet(
    `search:${q.toLowerCase()}`,
    SEARCH_TTL,
    async () => {
      const [{ data: profiles }, { data: projects }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, role")
          .ilike("username", `%${q}%`)
          .limit(5),
        supabase
          .from("project")
          .select("id, title, type, status, professor_id, profiles!professor_id(username)")
          .ilike("title", `%${q}%`)
          .limit(5),
      ])
      return { profiles: profiles ?? [], projects: projects ?? [] }
    }
  )

  return NextResponse.json(result)
}
