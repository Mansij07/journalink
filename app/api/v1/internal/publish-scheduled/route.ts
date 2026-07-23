import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateFeedAndAuthor } from "@/lib/posts"
import { logger } from "@/lib/logger"

// Must be >= the caller's polling interval (the CronJob runs every 2 minutes),
// so a run that's late or skipped once never lets a post's window fall
// entirely between two runs.
const LOOKBACK_MS = 3 * 60 * 1000

/**
 * Invalidates the feed/author cache for posts whose `scheduled_at` just
 * passed. Posts are already hidden/shown correctly by the `scheduled_at`
 * filter in every read (see lib/posts.ts) — this only tightens *when* a
 * scheduled post appears, from "next time its cache entry expires" (up to 5
 * minutes for an author's own page) down to within a couple of minutes of the
 * scheduled time. Safe to call repeatedly: invalidation is idempotent.
 *
 * Called by the `journalink-publish-scheduled` Kubernetes CronJob
 * (k8s/cronjob.yaml) over the in-cluster Service, authenticated with a shared
 * secret rather than a user session.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get("authorization")
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString()
  const now = new Date().toISOString()

  const { data: posts, error } = await admin
    .from("post")
    .select("id, author_id")
    .gte("scheduled_at", since)
    .lte("scheduled_at", now)

  if (error) {
    logger.error("publish-scheduled query failed", { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id as string))]
  for (const authorId of authorIds) {
    await invalidateFeedAndAuthor(authorId)
  }

  logger.info("published scheduled posts", { count: posts?.length ?? 0, authors: authorIds.length })
  return NextResponse.json({ published: posts?.length ?? 0, authors: authorIds.length })
}
