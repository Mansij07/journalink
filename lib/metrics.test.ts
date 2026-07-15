import { describe, it, expect } from "vitest"

import { Counter, Histogram, keyPrefix } from "@/lib/metrics"

describe("keyPrefix", () => {
  it("takes the first colon-delimited segment", () => {
    expect(keyPrefix("feed:page:0")).toBe("feed")
    expect(keyPrefix("noColonHere")).toBe("noColonHere")
  })
})

describe("Counter", () => {
  it("accumulates by label combination and renders Prometheus text format", () => {
    const c = new Counter("test_total", "a test counter")
    c.inc({ prefix: "feed" })
    c.inc({ prefix: "feed" })
    c.inc({ prefix: "search" }, 5)
    const text = c.render()
    expect(text).toContain("# HELP test_total a test counter")
    expect(text).toContain("# TYPE test_total counter")
    expect(text).toContain('test_total{prefix="feed"} 2')
    expect(text).toContain('test_total{prefix="search"} 5')
  })
})

describe("Histogram", () => {
  it("buckets observations cumulatively and tracks sum/count", () => {
    const h = new Histogram("test_duration_ms", "a test histogram", [10, 50, 100])
    h.observe(5)
    h.observe(30)
    h.observe(75)
    const text = h.render()
    expect(text).toContain('test_duration_ms_bucket{le="10"} 1')
    expect(text).toContain('test_duration_ms_bucket{le="50"} 2')
    expect(text).toContain('test_duration_ms_bucket{le="100"} 3')
    expect(text).toContain('test_duration_ms_bucket{le="+Inf"} 3')
    expect(text).toContain("test_duration_ms_sum 110")
    expect(text).toContain("test_duration_ms_count 3")
  })
})
