import { NextResponse } from "next/server"

import { renderMetrics } from "@/lib/metrics"

/**
 * Prometheus scrape endpoint. Gated by a shared secret rather than left open —
 * the Ingress routes everything under `/` to this app, so without a check this
 * would be reachable from the public internet, not just from an in-cluster
 * Prometheus. Configure Prometheus's scrape config with the same bearer token
 * via `METRICS_TOKEN`.
 */
export async function GET(request: Request) {
  const token = process.env.METRICS_TOKEN
  const header = request.headers.get("authorization")
  if (!token || header !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return new NextResponse(renderMetrics(), {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  })
}
