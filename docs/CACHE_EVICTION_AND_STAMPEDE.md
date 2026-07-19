# Caching: Eviction Policy + Stampede Protection Plan

## Context

Follow-up to a caching architecture review: no `maxmemory`/eviction policy is configured anywhere — Redis in Kubernetes will get OOM-killed and hard-restarted instead of gracefully evicting cold keys — and `cacheGetOrSet` has no stampede protection, so every concurrent request on an expired hot key independently misses and hits the DB. This document specifies exactly what to change, where, and why.

Reference: the full cache key catalog lives in `docs/API_DESIGN.md` §10. Not repeated here — only what's relevant to eviction/stampede decisions.

---

## A. Redis-level `maxmemory` + `maxmemory-policy`

**The core constraint**: this one Redis instance holds three kinds of data — pure cache (safe to lose), rate-limit counters (losing one early = a small abuse window, not a correctness break), and password-reset tokens (losing one early = a legitimate user's reset link breaks before its stated 1-hour validity — a real bug, not just a perf hit). All three currently carry a TTL (`EX`/`PEXPIRE`), which matters for the policy choice below.

**Recommendation: `maxmemory-policy volatile-lru`, with `maxmemory` set below the container's hard limit.**

- `volatile-lru` only ever evicts keys that have an expiry set — since literally every key this app writes has one, this is safe to apply globally without restructuring anything. It evicts the least-recently-used *of those*, which biases toward evicting cold cache entries before hot ones (a popular profile stays; an unvisited one goes first).
- Reject `allkeys-lru`/`allkeys-lfu`: no key in this app should ever be evicted *without* respecting its TTL semantics — not needed here since every key already expires on its own; `allkeys-*` adds risk (could theoretically evict something intended to be permanent later) for no benefit over `volatile-*` today.
- Reject `noeviction` (Redis default when unset): this is the current de facto behavior, and it's what causes the OOM-kill — once `maxmemory` is hit with `noeviction`, Redis rejects writes with an error instead of evicting, and combined with no `maxmemory` set at all today, the failure mode is worse (unbounded growth until the OS/cgroup kills the process).

**Sizing `maxmemory`**: in `k8s/redis.yaml`, the container `resources.limits.memory` is `256Mi`. Set Redis's own `maxmemory` to roughly 75–80% of that (e.g. `192mb`) via `--maxmemory 192mb --maxmemory-policy volatile-lru` in the container `args`, leaving headroom for Redis's own overhead, connection buffers, and AOF rewrite memory spikes (AOF rewrites can transiently use extra memory) — so **Redis evicts before the kernel/cgroup OOM-kills the pod**, not after.

**Where to change it**:
- `k8s/redis.yaml` — add `--maxmemory 192mb --maxmemory-policy volatile-lru` to the `args` list (currently: `["redis-server", "--appendonly", "yes"]`).
- `docker-compose.yml` — same two flags added to the `redis` service's `command` (currently: `["redis-server", "--appendonly", "yes"]`); pick a value appropriate to local dev (no hard container memory limit is set locally today — either leave unbounded for dev convenience, or mirror prod's `192mb` to catch eviction-related bugs before they reach prod. Recommend mirroring prod, since catching a stale-read-after-eviction bug locally is cheaper than in production).

**Advanced option (skip unless needed later)**: fully protect rate-limit counters and password-reset tokens from ever being evicted early by moving them to a separate Redis **logical database** (`ioredis`'s `db` client option, e.g. `db: 1`) while cache data stays on `db: 0`. `maxmemory-policy` is instance-wide, not per-logical-DB, so this alone doesn't change eviction targeting — it would only help if paired with a second physical Redis instance/deployment for `db: 1` with its own `noeviction` policy. Given cached JSON blobs (profiles, posts, project lists) are almost certainly the dominant memory consumer versus tiny counters/tokens, the realistic risk of `volatile-lru` evicting a rate-limit counter or reset token before pure cache data is already low — treat this as a "nice to have if you see it happen in practice," not a required first step.

---

## B. Per-cache-family eviction risk

Redis only supports one global `maxmemory-policy`; there's no native per-key-family algorithm choice. The actual per-use control already available is **TTL length**, which indirectly shapes eviction behavior (shorter TTL = naturally recomputed/evicted sooner regardless of LRU pressure). Current TTLs are already reasonably tiered — no changes recommended, just noting the tiers for context when reasoning about eviction pressure:

| Tier | Keys | TTL | Eviction risk if memory-pressured |
|---|---|---|---|
| Very hot / cheap to recompute | `feed:page:{n}` | 45s | Low impact — already turns over constantly |
| Hot, moderate cost | `applications:prof/student:{id}` | 60s | Low impact |
| Warm | `posts:author:*`, `projects:open`, `projects:owner:*`, `count:*`, `following:ids:*`, `mentions:*`, `suggestions:*`, `recent:*` | 5–10 min | Moderate — an evicted key here means one extra DB round-trip on next access, no correctness issue |
| Cold, most expensive to lose | `post:{id}`, `profile:id/username:{id}`, `project:{id}` | 15 min–1 hr | Higher perceived impact only because it was cached longest / most "worth keeping" — but still just a cache, so `volatile-lru` naturally protects frequently-accessed ones anyway |
| Not really cache (correctness-sensitive) | rate-limit counters, `pwreset:{token}` | seconds–1 hr, functional not perf | Only category where early eviction is a real (if low-probability) bug, not just a perf blip — see Advanced option above |

No TTL changes recommended — they're already sensibly tiered by recompute cost and staleness tolerance.

---

## C. Cache stampede fix

**Problem** (confirmed in `lib/redis.ts`'s `cacheGetOrSet`): on a miss, every concurrent caller independently calls `fetcher()` and independently writes back — no coordination. With `k8s/hpa.yaml` present, this app can run multiple replicas, so the fix must be a **distributed** lock (Redis-based), not an in-process mutex — an in-memory lock in one pod wouldn't stop a different replica from also missing and recomputing at the same moment.

**Recommended design**: add a short-lived distributed lock around the `fetcher()` call inside `cacheGetOrSet` itself, so **every current cache call site gets the fix automatically with zero per-call-site changes**.

1. On a cache miss, before calling `fetcher()`, attempt to acquire a lock: `SET lock:{key} 1 NX PX <lockTtlMs>`. `NX` = only set if not already present (this *is* the lock acquisition — atomic by construction). `PX` = auto-expiring lock, so a crashed holder can't wedge it forever.
   - Suggested `lockTtlMs`: slightly longer than the DB breaker's own timeout (4000ms) — e.g. `5000ms` — so the lock always outlives the worst-case legitimate fetch, but still self-heals quickly if the holder dies mid-fetch.
2. **Lock acquired** → proceed exactly as today: call `fetcher()`, `SET key value EX ttl` on success, then explicitly `DEL lock:{key}` (don't wait for its own PX to expire — release it as soon as the real value is written, so waiters don't sit idle for the rest of the lock window).
3. **Lock not acquired** (someone else — this pod or another replica — is already recomputing) → don't call `fetcher()` yourself. Instead, poll the real cache key (`GET key`) with a short backoff (e.g. 4 attempts, 50ms/100ms/200ms/400ms) waiting for the lock-holder to finish and populate it.
   - If a value shows up during the wait window → return it (this is the whole point: N concurrent requests collapse into 1 DB call + N cheap Redis reads).
   - If the wait budget is exhausted and the key is still empty (holder is unusually slow, or died and the lock hasn't expired yet) → **fall through and call `fetcher()` directly anyway**, bypassing the lock entirely. This bounds worst-case added latency to the wait budget (~750ms) rather than risking indefinite queuing under sustained load — availability still wins over strict single-flight purity, consistent with this codebase's existing fail-open philosophy elsewhere.
4. Both the lock `SET`/`DEL` and the polling `GET`s should run through the existing `redisBreaker`, same as every other Redis call in this file — if the Redis breaker is open, skip locking entirely and call `fetcher()` directly (current behavior), same fallback philosophy as the rest of `lib/redis.ts`.

**Where to change it**: entirely inside `cacheGetOrSet` in `lib/redis.ts` (the miss-handling branch, roughly where `fresh = await dbBreaker.runOrThrow(fetcher)` currently is) — no changes needed in `lib/social.ts`, `lib/posts.ts`, `lib/profile.ts`, `lib/projects.ts`, `lib/applications.ts`, or `app/api/search/route.ts`, since they all just call `cacheGetOrSet` and inherit the fix.

**Optional follow-up, not required for the core fix**: for `feed:page:{n}` and `search:{query}` specifically (shortest TTLs, highest read traffic, so most exposed to repeated stampedes), consider upgrading later to **stale-while-revalidate**: store a physical TTL longer than the logical one (e.g. physical `EX = ttl * 3`), track a `freshAt` timestamp inside the cached JSON payload, and on a read past `freshAt` but before physical expiry, serve the stale value immediately while one instance (winner of the same lock) refreshes in the background. This gets near-zero latency even during a stampede (nobody blocks), at the cost of tolerating data slightly staler than the nominal TTL — reasonable given these two already tolerate 45s–2min staleness by design. Worth doing only if the lock+wait fix above turns out insufficient under real traffic; the lock+wait fix alone already eliminates the "N simultaneous DB hits" problem, just with a small added-latency tax on the waiters instead of zero.

---

## D. Summary of concrete edits

| File | Change |
|---|---|
| `k8s/redis.yaml` | Add `--maxmemory 192mb --maxmemory-policy volatile-lru` to Redis container `args` |
| `docker-compose.yml` | Add same two flags to the `redis` service's `command` |
| `lib/redis.ts` | Add lock-acquire/wait/fallback logic inside `cacheGetOrSet`'s miss branch, per §C above; no other file needs to change |

## Verification (once implemented)

- **Eviction**: locally, run `redis-cli config get maxmemory maxmemory-policy` against the compose Redis to confirm the flags took; optionally fill the cache past the new `maxmemory` (e.g. a script hammering several endpoints with distinct query params to generate many `search:{query}` keys) and confirm via `redis-cli info stats` (`evicted_keys` counter increasing) that Redis evicts instead of erroring or the container restarting.
- **Stampede fix**: hit an endpoint backing a short-TTL key (e.g. `GET /api/feed`) with ~20 concurrent requests right after its cache entry expires (a small `Promise.all` of fetches, or a tool like `autocannon`/`k6`), and confirm via logs/metrics that `cacheMisses` (or a DB query log / added temporary console log in the `fetcher`) increments only **once** for that key during the burst, not ~20 times.
