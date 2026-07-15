import "server-only"

type Labels = Record<string, string>

function labelKey(labels?: Labels): string {
  if (!labels) return ""
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`)
    .join(",")
}

/**
 * A Prometheus-style counter, in-process memory only. Metrics are per-pod —
 * with the HPA running multiple replicas, that's the normal model (Prometheus
 * scrapes each pod and aggregates), not a limitation specific to this code.
 */
export class Counter {
  private values = new Map<string, number>()
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}

  inc(labels?: Labels, by = 1): void {
    const key = labelKey(labels)
    this.values.set(key, (this.values.get(key) ?? 0) + by)
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`]
    for (const [key, value] of this.values) {
      lines.push(`${this.name}${key ? `{${key}}` : ""} ${value}`)
    }
    return lines.join("\n")
  }
}

/** A Prometheus-style histogram (cumulative buckets + sum + count), same in-process scope as Counter. */
export class Histogram {
  private bucketCounts = new Map<string, number[]>()
  private sums = new Map<string, number>()
  private totals = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    private readonly buckets: number[]
  ) {}

  observe(value: number, labels?: Labels): void {
    const key = labelKey(labels)
    if (!this.bucketCounts.has(key)) {
      this.bucketCounts.set(key, new Array(this.buckets.length).fill(0))
    }
    const counts = this.bucketCounts.get(key)!
    this.buckets.forEach((bound, i) => {
      if (value <= bound) counts[i] += 1
    })
    this.sums.set(key, (this.sums.get(key) ?? 0) + value)
    this.totals.set(key, (this.totals.get(key) ?? 0) + 1)
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`]
    for (const [key, counts] of this.bucketCounts) {
      const labelPrefix = key ? `${key},` : ""
      this.buckets.forEach((bound, i) => {
        lines.push(`${this.name}_bucket{${labelPrefix}le="${bound}"} ${counts[i]}`)
      })
      lines.push(`${this.name}_bucket{${labelPrefix}le="+Inf"} ${this.totals.get(key)}`)
      lines.push(`${this.name}_sum${key ? `{${key}}` : ""} ${this.sums.get(key)}`)
      lines.push(`${this.name}_count${key ? `{${key}}` : ""} ${this.totals.get(key)}`)
    }
    return lines.join("\n")
  }
}

/** First colon-delimited segment of a cache key (e.g. "feed:page:0" -> "feed") — bounded cardinality for a label. */
export function keyPrefix(key: string): string {
  return key.split(":")[0] ?? key
}

export const cacheHits = new Counter("journalink_cache_hits_total", "Cache hits, by key prefix")
export const cacheMisses = new Counter("journalink_cache_misses_total", "Cache misses, by key prefix")
export const breakerTrips = new Counter(
  "journalink_circuit_breaker_trips_total",
  "Circuit breaker trip events, by breaker name"
)
export const rateLimitBlocked = new Counter(
  "journalink_rate_limit_blocked_total",
  "Requests blocked by the rate limiter, by route"
)
export const httpRequestDuration = new Histogram(
  "journalink_http_request_duration_ms",
  "HTTP request duration in milliseconds, by route and status",
  [10, 50, 100, 250, 500, 1000, 2500, 5000]
)

/** Renders every registered metric in Prometheus text exposition format. */
export function renderMetrics(): string {
  return (
    [cacheHits, cacheMisses, breakerTrips, rateLimitBlocked, httpRequestDuration]
      .map((m) => m.render())
      .join("\n\n") + "\n"
  )
}
