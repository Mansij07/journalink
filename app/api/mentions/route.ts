import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getMentionCandidates } from "@/lib/social"

/**
 * Profiles the current user follows — the candidate pool for @-mention
 * autocomplete. The client filters this list by the typed query.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profiles = await getMentionCandidates(supabase, user.id)
  return NextResponse.json({ profiles })
}
