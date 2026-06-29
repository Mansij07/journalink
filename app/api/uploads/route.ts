import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const BUCKETS = ["avatars", "post-media"] as const
type Bucket = (typeof BUCKETS)[number]
type Kind = "avatar" | "image" | "video" | "doc"

/** Build a storage path scoped to the user — never trust a client-supplied path. */
function buildPath(kind: Kind, userId: string, ext: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  switch (kind) {
    case "avatar":
      return `${userId}/avatar-${stamp}.${ext}`
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

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, path })
}
