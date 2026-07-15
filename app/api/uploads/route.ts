import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rateLimit"

const BUCKETS = ["avatars", "post-media", "resumes"] as const
type Bucket = (typeof BUCKETS)[number]
type Kind = "avatar" | "image" | "video" | "doc" | "resume"

/** Build a storage path scoped to the user — never trust a client-supplied path.
 * The user id is the FIRST path segment so the standard Supabase "own folder"
 * storage policy ((storage.foldername(name))[1] = auth.uid()) permits the write. */
function buildPath(kind: Kind, userId: string, ext: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  switch (kind) {
    case "avatar":
      return `${userId}/avatar-${stamp}.${ext}`
    case "resume":
      return `${userId}/resume-${stamp}.${ext}`
    case "video":
      return `videos/${userId}/${stamp}.${ext}`
    case "doc":
      return `docs/${userId}/${stamp}.${ext}`
    default:
      return `${userId}/${stamp}.${ext}`
  }
}

/**
 * Upload a file to Supabase Storage server-side and return its public URL.
 * The browser POSTs multipart form-data: `file`, `bucket`, and `kind`. Paths
 * are derived from the authenticated user id, so a client can't write elsewhere.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { allowed, retryAfterSeconds } = await rateLimit(`uploads:${user.id}`, 20, 5 * 60)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a bit." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 })
  }

  const file = form.get("file")
  const bucket = String(form.get("bucket") ?? "") as Bucket
  const kind = String(form.get("kind") ?? "image") as Kind

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 })
  }
  if (!BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "bin"
  const path = buildPath(kind, user.id, ext)

  // Paths are unique (timestamp + random), so upsert is unnecessary. Avoid it for
  // the resumes bucket: upsert needs UPDATE/SELECT storage policies, and resumes
  // only grants INSERT — an upsert there fails RLS. Keep upsert for the other
  // buckets to preserve their existing behavior.
  const upsert = bucket !== "resumes"
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert, contentType: file.type || undefined })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, path })
}
