import { describe, it, expect, vi, beforeEach } from "vitest"

const { evalMock } = vi.hoisted(() => ({ evalMock: vi.fn() }))
vi.mock("@/lib/redis", () => ({
  redis: { eval: evalMock },
}))

import { rateLimit } from "@/lib/rateLimit"

describe("rateLimit", () => {
  beforeEach(() => {
    evalMock.mockReset()
  })

  it("allows a request under the limit", async () => {
    evalMock.mockResolvedValue(1)
    const result = await rateLimit("user:1", 5, 60)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks once the count exceeds the limit", async () => {
    evalMock.mockResolvedValue(6)
    const result = await rateLimit("user:1", 5, 60)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("fails open (allows the request) if Redis is unavailable", async () => {
    evalMock.mockRejectedValue(new Error("ECONNREFUSED"))
    const result = await rateLimit("user:1", 5, 60)
    expect(result.allowed).toBe(true)
  })

  it("runs an atomic EVAL keyed by the current window, with the TTL in milliseconds", async () => {
    evalMock.mockResolvedValue(1)
    await rateLimit("user:1", 5, 60)
    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.stringContaining("ratelimit:user:1:"),
      60_000
    )
  })
})
