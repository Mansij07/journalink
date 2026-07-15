import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { createCircuitBreaker, CircuitBreakerOpenError } from "@/lib/circuitBreaker"

describe("createCircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("run() returns the op's result on success", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 2,
      cooldownMs: 1000,
    })
    await expect(breaker.run(async () => "ok", "fallback")).resolves.toBe("ok")
  })

  it("run() returns fallback on failure without tripping below threshold", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 3,
      cooldownMs: 1000,
    })
    const result = await breaker.run(async () => {
      throw new Error("boom")
    }, "fallback")
    expect(result).toBe("fallback")
    expect(breaker.isOpen()).toBe(false)
  })

  it("trips open after reaching the failure threshold and calls onTrip", async () => {
    const onTrip = vi.fn()
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 2,
      cooldownMs: 1000,
      onTrip,
    })
    const failing = async () => {
      throw new Error("boom")
    }
    await breaker.run(failing, "fallback")
    expect(breaker.isOpen()).toBe(false)
    await breaker.run(failing, "fallback")
    expect(breaker.isOpen()).toBe(true)
    expect(onTrip).toHaveBeenCalledWith("t", 2)
  })

  it("while open, run() returns fallback without invoking op again", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 1,
      cooldownMs: 1000,
    })
    await breaker.run(async () => {
      throw new Error("boom")
    }, "fallback")
    expect(breaker.isOpen()).toBe(true)

    const op = vi.fn(async () => "ok")
    const result = await breaker.run(op, "fallback")
    expect(result).toBe("fallback")
    expect(op).not.toHaveBeenCalled()
  })

  it("runOrThrow() throws CircuitBreakerOpenError while open", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 1,
      cooldownMs: 1000,
    })
    await breaker.run(async () => {
      throw new Error("boom")
    }, "fallback")
    expect(breaker.isOpen()).toBe(true)
    await expect(breaker.runOrThrow(async () => "ok")).rejects.toBeInstanceOf(
      CircuitBreakerOpenError
    )
  })

  it("closes again after cooldown once a probe succeeds, and calls onReset", async () => {
    const onReset = vi.fn()
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 1,
      cooldownMs: 1000,
      onReset,
    })
    await breaker.run(async () => {
      throw new Error("boom")
    }, "fallback")
    expect(breaker.isOpen()).toBe(true)

    await vi.advanceTimersByTimeAsync(1001)
    expect(breaker.isOpen()).toBe(false)

    const result = await breaker.run(async () => "ok", "fallback")
    expect(result).toBe("ok")
    expect(onReset).toHaveBeenCalledWith("t")
  })

  it("re-opens if the post-cooldown probe also fails", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 100,
      failureThreshold: 1,
      cooldownMs: 1000,
    })
    const failing = async () => {
      throw new Error("boom")
    }
    await breaker.run(failing, "fallback")
    expect(breaker.isOpen()).toBe(true)

    await vi.advanceTimersByTimeAsync(1001)
    expect(breaker.isOpen()).toBe(false)

    await breaker.run(failing, "fallback")
    expect(breaker.isOpen()).toBe(true)
  })

  it("treats a timeout as a failure", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      timeoutMs: 50,
      failureThreshold: 1,
      cooldownMs: 1000,
    })
    const slowOp = () => new Promise<string>((resolve) => setTimeout(() => resolve("late"), 500))
    const resultPromise = breaker.run(slowOp, "fallback")
    await vi.advanceTimersByTimeAsync(51)
    await expect(resultPromise).resolves.toBe("fallback")
    expect(breaker.isOpen()).toBe(true)
  })
})
