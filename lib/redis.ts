import "server-only"
import Redis from "ioredis"

import { createCircuitBreaker, CircuitBreakerOpenError } from "@/lib/circuitBreaker"
import { logger } from "@/lib/logger"
import { cacheHits, cacheMisses, breakerTrips, keyPrefix } from "@/lib/metrics"

const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    commandTimeout: 1000,
    retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
  })

if (!globalForRedis.redis) {
  redis.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[redis] connection error:", err.message)
    }
  })
}

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis

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

export class ServiceUnavailableError extends Error {
  constructor(source: string) {
    super(`${source} is temporarily unavailable`)
    this.name = "ServiceUnavailableError"
  }
}

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

export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await redisBreaker.run(() => redis.del(...keys), 0)
}

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
