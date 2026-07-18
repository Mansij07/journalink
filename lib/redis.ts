import "server-only"
import Redis from "ioredis"

import { createCircuitBreaker, CircuitBreakerOpenError } from "@/lib/circuitBreaker"
import { logger } from "@/lib/logger"
import { cacheHits, cacheMisses, breakerTrips, keyPrefix } from "@/lib/metrics"

/**
 * Single shared ioredis connection. In dev, Next.js hot-reloads modules, which
 * would otherwise open a new connection on every reload — so we stash it on
 * globalThis and reuse it.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    // Bound how long any single command can wait — including one issued
    // during the brief handshake right after the process boots, which the
    // offline queue (left enabled, its default) absorbs instead of throwing
    // synchronously. Without this, `enableOfflineQueue: false` used to reject
    // that first command outright, which silently defeated call sites like
    // the rate limiter that fail open on any Redis error.
    commandTimeout: 1000,
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
const redisBreaker = createCircuitBreaker({
  name: "redis",
  timeoutMs: 150,
  failureThreshold: 3,
  cooldownMs: 10_000,
  onTrip: (name, failures) => {
    logger.warn("circuit breaker tripped", { breaker: name, failures })
    breakerTrips.inc({ breaker: name })
  },
  onReset: (name) => logger.info("circuit breaker reset", { breaker: name }),
})

/**
 * Circuit breaker around the database fetcher passed to `cacheGetOrSet`. Unlike
 * the Redis breaker, the DB has no lower fallback to fail over to — so this
 * exists to bound latency (a wedged DB call no longer hangs a request
 * indefinitely) and to fail fast once the DB is clearly down, rather than to
 * silently degrade. `runOrThrow` is used so an open breaker surfaces as a typed
 * `ServiceUnavailableError` instead of a generic hang or an ambiguous throw.
 */
const dbBreaker = createCircuitBreaker({
  name: "db",
  timeoutMs: 4_000,
  failureThreshold: 3,
  cooldownMs: 5_000,
  onTrip: (name, failures) => {
    logger.error("circuit breaker tripped", { breaker: name, failures })
    breakerTrips.inc({ breaker: name })
  },
  onReset: (name) => logger.info("circuit breaker reset", { breaker: name }),
})

/** Thrown by `cacheGetOrSet` when the DB breaker is open, so callers can choose to return a 503. */
export class ServiceUnavailableError extends Error {
  constructor(source: string) {
    super(`${source} is temporarily unavailable`)
    this.name = "ServiceUnavailableError"
  }
}

/**
 * Read `key` from Redis; on a miss, run `fetcher`, store the result with a TTL,
 * and return it. Designed to be cache-resilient: if Redis is unavailable/slow
 * (or the breaker is open) for either the read or the write, we silently fall
 * back to `fetcher` so the app keeps working off the database. `null`/`undefined`
 * results are not cached (no negative caching).
 *
 * `fetcher` itself runs under the DB breaker (see above) — a slow/down DB
 * throws `ServiceUnavailableError` once tripped instead of hanging.
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const prefix = keyPrefix(key)
  const cached = await redisBreaker.run(() => redis.get(key), null)
  if (cached !== null) {
    try {
      const parsed = JSON.parse(cached) as T
      cacheHits.inc({ prefix })
      return parsed
    } catch {
      // Corrupt cache entry — fall through to the source.
    }
  }
  cacheMisses.inc({ prefix })

  let fresh: T
  try {
    fresh = await dbBreaker.runOrThrow(fetcher)
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      logger.warn("db breaker open, failing fast", { key })
      throw new ServiceUnavailableError("database")
    }
    throw err
  }

  if (fresh !== null && fresh !== undefined) {
    await redisBreaker.run(
      () => redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds),
      null
    )
  }

  return fresh
}

/** Delete one or more cache keys. Safe/no-op when Redis is unavailable or the breaker is open. */
export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await redisBreaker.run(() => redis.del(...keys), 0)
}

/**
 * Delete every key matching `{prefix}*` using a non-blocking SCAN (safe for
 * production, unlike `KEYS`). Used to bust paginated key families such as
 * `feed:page:0`, `feed:page:1`, … in one call. Best-effort: no-op when Redis is
 * unavailable or the breaker is open.
 */
export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  if (redisBreaker.isOpen()) return
  await redisBreaker.run(async () => {
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
