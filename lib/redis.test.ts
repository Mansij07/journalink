import { describe, it, expect, vi, beforeEach } from "vitest"

const store = new Map<string, string>()

const redisMock = {
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  set: vi.fn(async (key: string, value: string) => {
    store.set(key, value)
    return "OK"
  }),
  del: vi.fn(async (...keys: string[]) => {
    let n = 0
    for (const k of keys) if (store.delete(k)) n++
    return n
  }),
  scan: vi.fn(async () => ["0", [] as string[]]),
  on: vi.fn(),
}

vi.mock("ioredis", () => ({
  default: vi.fn(function MockRedis() {
    return redisMock
  }),
}))

describe("cacheGetOrSet", () => {
  beforeEach(() => {
    vi.resetModules()
    store.clear()
    redisMock.get.mockClear()
    redisMock.set.mockClear()
    redisMock.del.mockClear()
    redisMock.scan.mockClear()
  })

  it("returns a cached value on hit without calling the fetcher", async () => {
    const { cacheGetOrSet } = await import("@/lib/redis")
    store.set("k1", JSON.stringify({ v: 1 }))
    const fetcher = vi.fn(async () => ({ v: 2 }))

    const result = await cacheGetOrSet("k1", 60, fetcher)

    expect(result).toEqual({ v: 1 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("calls the fetcher and caches the result on a miss", async () => {
    const { cacheGetOrSet } = await import("@/lib/redis")
    const fetcher = vi.fn(async () => ({ v: 42 }))

    const result = await cacheGetOrSet("k2", 60, fetcher)

    expect(result).toEqual({ v: 42 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(store.get("k2")!)).toEqual({ v: 42 })
  })

  it("does not cache null/undefined fetcher results", async () => {
    const { cacheGetOrSet } = await import("@/lib/redis")
    await cacheGetOrSet("k3", 60, async () => null)
    expect(store.has("k3")).toBe(false)
  })

  it("trips the DB breaker after 3 consecutive fetcher failures, then fails fast without re-invoking it", async () => {
    const { cacheGetOrSet, ServiceUnavailableError } = await import("@/lib/redis")
    const failingFetcher = vi.fn(async () => {
      throw new Error("db down")
    })

    await expect(cacheGetOrSet("k4", 60, failingFetcher)).rejects.toThrow("db down")
    await expect(cacheGetOrSet("k5", 60, failingFetcher)).rejects.toThrow("db down")
    await expect(cacheGetOrSet("k6", 60, failingFetcher)).rejects.toThrow("db down")
    expect(failingFetcher).toHaveBeenCalledTimes(3)

    await expect(cacheGetOrSet("k7", 60, failingFetcher)).rejects.toThrow(ServiceUnavailableError)
    expect(failingFetcher).toHaveBeenCalledTimes(3)
  })
})

describe("cacheDelete / cacheDeleteByPrefix", () => {
  beforeEach(() => {
    vi.resetModules()
    store.clear()
    redisMock.get.mockClear()
    redisMock.set.mockClear()
    redisMock.del.mockClear()
    redisMock.scan.mockClear()
  })

  it("cacheDelete removes the given keys", async () => {
    const { cacheDelete } = await import("@/lib/redis")
    store.set("a", "1")
    store.set("b", "2")
    await cacheDelete("a", "b")
    expect(store.has("a")).toBe(false)
    expect(store.has("b")).toBe(false)
  })

  it("cacheDeleteByPrefix scans and deletes matching keys", async () => {
    redisMock.scan.mockResolvedValueOnce(["0", ["feed:page:0", "feed:page:1"]])
    store.set("feed:page:0", "x")
    store.set("feed:page:1", "y")
    store.set("profile:id:1", "z")

    const { cacheDeleteByPrefix } = await import("@/lib/redis")
    await cacheDeleteByPrefix("feed:page:")

    expect(store.has("feed:page:0")).toBe(false)
    expect(store.has("feed:page:1")).toBe(false)
    expect(store.has("profile:id:1")).toBe(true)
  })
})
