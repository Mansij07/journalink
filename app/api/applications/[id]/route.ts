import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const ALLOWED_STATUSES = ["pending", "accepted", "rejected", "declined"] as const

/**
 * Update an application's status (accept/reject by the professor, decline by
 * the student). RLS enforces who may change which application.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: body.status })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
