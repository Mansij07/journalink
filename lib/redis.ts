import "server-only"
import Redis from "ioredis"

/**
 * Single shared ioredis connection. In dev, Next.js hot-reloads modules, which
 * would otherwise open a new connection on every reload — so we stash it on
 * globalThis and reuse it.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // Fail fast instead of queueing forever if Redis is unreachable, so the
    // caller can fall back to the database.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  })

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis

/**
 * Read `key` from Redis; on a miss, run `fetcher`, store the result with a TTL,
 * and return it. Designed to be cache-resilient: if Redis is unavailable for
 * either the read or the write, we silently fall back to `fetcher` so the app
 * keeps working off the database. `null`/`undefined` results are not cached
 * (no negative caching).
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached !== null) return JSON.parse(cached) as T
  } catch {
    // Cache read failed (Redis down, etc.) — fall through to the source.
  }

  const fresh = await fetcher()

  if (fresh !== null && fresh !== undefined) {
    try {
      await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds)
    } catch {
      // Cache write failed — ignore, the value is already loaded. 
    }
  }

  return fresh
}

/** Delete one or more cache keys. Safe to call when Redis is unavailable. */
export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch {
    // Best-effort invalidation; ignore failures.
  }
}

/**
 * Delete every key matching `{prefix}*` using a non-blocking SCAN (safe for
 * production, unlike `KEYS`). Used to bust paginated key families such as
 * `feed:page:0`, `feed:page:1`, … in one call. Best-effort: ignores failures.
 */
export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  try {
    let cursor = "0"
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100
      )
      cursor = next
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== "0")
  } catch {
    // Best-effort invalidation; ignore failures.
  }
}
