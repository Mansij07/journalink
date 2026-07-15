import "server-only"

import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { rateLimitBlocked } from "@/lib/metrics"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

// Atomic fixed-window counter: INCR the window's key, set its expiry only on
// the first hit in that window. Runs as a single EVAL so concurrent requests
// sharing a key never race between the INCR and the expiry set (two requests
// landing in the same millisecond must still agree on one counter value).
const INCR_AND_EXPIRE = `
local current = redis.call("INCR", KEYS[1])
if tonumber(current) == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`

/**
 * Fixed-window rate limiter keyed by `key` (typically a user id, scoped per
 * route by the caller), allowing up to `limit` calls per `windowSeconds`.
 * Fails open (allows the request) if Redis is unavailable — availability of
 * the app takes priority over strict limiting, the same tradeoff already made
 * for caching in `lib/redis.ts`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const windowIndex = Math.floor(Date.now() / (windowSeconds * 1000))
  const windowKey = `ratelimit:${key}:${windowIndex}`

  try {
    const count = (await redis.eval(
      INCR_AND_EXPIRE,
      1,
      windowKey,
      windowSeconds * 1000
    )) as number

    const allowed = count <= limit
    if (!allowed) rateLimitBlocked.inc({ scope: key.split(":")[0] ?? "unknown" })

    return { allowed, remaining: Math.max(0, limit - count), retryAfterSeconds: windowSeconds }
  } catch (err) {
    logger.warn("rate limiter unavailable, failing open", {
      key,
      error: err instanceof Error ? err.message : String(err),
    })
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
  }
}
