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
    // Cap reconnect attempts instead of retrying forever when Redis is down
    // (e.g. not running locally in dev).
    retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
  })

// ioredis throws an unhandled error if no "error" listener is registered.
// All call sites already catch failures and fall back to the database, so
// just log here instead of letting the process crash.
if (!globalForRedis.redis) {
  redis.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[redis] connection error:", err.message)
    }
  })
}

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis

/**
 * Circuit breaker + per-call timeout around Redis. Even with `maxRetriesPerRequest`
 * and offline-queue disabled, a Redis that is *up but slow* can add latency to
 * every request, and a down Redis is retried on every call. The breaker trips
 * after a few consecutive failures/timeouts and, while open, we skip Redis
 * entirely and go straight to the database — so a degraded cache never drags
 * down the app. A single success closes it again.
 */
const REDIS_TIMEOUT_MS = 150
const FAILURE_THRESHOLD = 3
const COOLDOWN_MS = 10_000

const breaker = { failures: 0, openUntil: 0 }

/** Whether the breaker is currently open (Redis calls should be skipped). */
function breakerOpen(): boolean {
  return Date.now() < breaker.openUntil
}

function recordSuccess(): void {
  breaker.failures = 0
  breaker.openUntil = 0
}

function recordFailure(): void {
  breaker.failures += 1
  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.openUntil = Date.now() + COOLDOWN_MS
  }
}

/**
 * Run a Redis operation with a timeout and breaker bookkeeping. Returns
 * `fallback` if the breaker is open, the op times out, or the op throws — so
 * callers never hang on or crash from a bad cache.
 */
async function withRedis<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  if (breakerOpen()) return fallback
  try {
    const result = await Promise.race([
      op(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis-timeout")), REDIS_TIMEOUT_MS)
      ),
    ])
    recordSuccess()
    return result
  } catch {
    recordFailure()
    return fallback
  }
}

/**
 * Read `key` from Redis; on a miss, run `fetcher`, store the result with a TTL,
 * and return it. Designed to be cache-resilient: if Redis is unavailable/slow
 * (or the breaker is open) for either the read or the write, we silently fall
 * back to `fetcher` so the app keeps working off the database. `null`/`undefined`
 * results are not cached (no negative caching).
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await withRedis(() => redis.get(key), null)
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T
    } catch {
      // Corrupt cache entry — fall through to the source.
    }
  }

  const fresh = await fetcher()

  if (fresh !== null && fresh !== undefined) {
    await withRedis(
      () => redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds),
      null
    )
  }

  return fresh
}

/** Delete one or more cache keys. Safe/no-op when Redis is unavailable or the breaker is open. */
export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await withRedis(() => redis.del(...keys), 0)
}

/**
 * Delete every key matching `{prefix}*` using a non-blocking SCAN (safe for
 * production, unlike `KEYS`). Used to bust paginated key families such as
 * `feed:page:0`, `feed:page:1`, … in one call. Best-effort: no-op when Redis is
 * unavailable or the breaker is open.
 */
export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  if (breakerOpen()) return
  await withRedis(async () => {
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
  }, undefined)
}
