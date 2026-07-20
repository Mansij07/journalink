import "server-only"

import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { rateLimitBlocked } from "@/lib/metrics"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const INCR_AND_EXPIRE = `
local current = redis.call("INCR", KEYS[1])
if tonumber(current) == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`
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
