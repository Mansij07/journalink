# Journalink

A social and research platform built for BITS Pilani — connecting students, researchers, and projects across campus.

---

## Overview

Journalink is a university-focused platform that bridges academic research and student collaboration. Professors post research projects, students discover and apply to them, and everyone shares updates through a Twitter-style feed — all within a single platform tailored to the BITS ecosystem.

---

## Features

### Accounts & Onboarding

- **Sign up / sign in** — Email + password, or one-click GitHub / Google OAuth via Supabase Auth
- **Onboarding** — New users pick a username and a role (Student or Professor); a middleware gate ensures onboarding is complete before accessing the app
- **Password reset** — Custom forgot/reset-password flow using single-use tokens stored in Redis and delivered by email via Resend
- **Session security** — Sessions re-validated on every request at the edge; unauthenticated users are redirected to login

### Profiles & Social Graph

- **Rich profiles** — Full name, bio, branch, year, skills, and avatar, all editable from Settings
- **Role badges** — Student / Professor badge shown across the app
- **Follow system** — Follow and unfollow users; live follower / following counts
- **Discovery** — Browse and search profiles across campus

### Research Projects

- **Post projects** — Professors create research projects with a title, type, description, requirements, required skills, number of slots, and a deadline
- **Manage projects** — Edit, track, and review applicants from a dedicated management view
- **Browse & apply** — Students discover open projects and apply in a click
- **Auto-close** — Projects close automatically when the deadline passes or all slots are filled

### Applications Pipeline

- **End-to-end flow** — Apply → professor accepts or rejects → student confirms or declines the offer
- **Confirmation cap** — A year-based limit on how many projects a student can confirm, enforced server-side
- **Status tracking** — Students see the live status of every application; professors review all applicants in one place

### Feed & Posts

- **Composer** — Write posts with @mentions, image / video / document attachments, and optional scheduling for later
- **Engagement** — Like, comment (with like / dislike on comments), repost, and bookmark
- **Infinite scroll** — Feed paginates seamlessly as you scroll
- **Permalinks** — Every post has its own shareable page

### Search & Notifications

- **Global search** — A single search bar covering both profiles and projects
- **Real-time notifications** — Instant in-app alerts for likes, follows, comments, mentions, and application events, pushed over Supabase Realtime (WebSocket) with a poll fallback — see [Real-time Notifications](#real-time-notifications)
- **Scheduled posts, promptly** — A Kubernetes CronJob nudges the cache the moment a scheduled post's time arrives, instead of waiting out its TTL — see [Scheduled Posts](#scheduled-posts)

### Personalization

- **Settings** — Manage profile, appearance, and account from one place
- **Themes** — Light / dark mode support

### Under the Hood

- **Caching** — Redis (ioredis) cache-aside layer in front of profiles, projects, feed pages, and search, with explicit invalidation on writes
- **Resilience** — A reusable circuit breaker (`lib/circuitBreaker.ts`) guards both Redis (150ms timeout, opens after 3 failures) and the database fetch inside every cached read (4s timeout, opens after 3 failures) — a wedged dependency degrades or fails fast instead of hanging every request. See [Resilience](#resilience-circuit-breakers).
- **Rate limiting** — An atomic, Redis-backed sliding-window limiter (`lib/rateLimit.ts`) on password-reset requests, post creation, uploads, and search — fails open if Redis is down.
- **Observability** — Structured JSON logging (`lib/logger.ts`) and a hand-rolled Prometheus metrics registry (`lib/metrics.ts`) exposed at `/api/metrics` — see [Observability](#observability).
- **File storage** — Supabase Storage for avatars and post media, with server-derived, per-user upload paths

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Animation | GSAP, Framer Motion |
| Backend & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Caching | Redis (ioredis) |
| Email | Resend |
| Testing | Vitest |
| CI/CD | GitHub Actions (lint/typecheck/test/build → build & push image → deploy) |
| Deployment | Vercel, or Docker / Kubernetes (see below) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with OAuth providers configured (GitHub, Google)
- A Redis instance (for caching, rate limiting, and password-reset tokens)
- A Resend account (for password-reset emails)

### Installation

```bash
git clone https://github.com/Mansij07/journalink.git
cd journalink
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REDIS_URL=your_redis_connection_string
RESEND_API_KEY=your_resend_api_key
# Shared secret the publish-scheduled CronJob sends as a bearer token.
CRON_SECRET=some_random_string
# Shared secret an in-cluster Prometheus sends as a bearer token to /api/metrics.
METRICS_TOKEN=some_random_string
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest, single run
npm run test:watch # Vitest, watch mode
```

Unit tests cover the circuit breaker (`lib/circuitBreaker.test.ts`), the Redis
cache/DB-breaker integration (`lib/redis.test.ts`), the rate limiter
(`lib/rateLimit.test.ts`), the auth/onboarding gate (`lib/authGate.test.ts`),
and the metrics registry (`lib/metrics.test.ts`). They run against mocked
Redis/ioredis, not a live instance — see `vitest.config.ts` for the
`server-only` alias that makes this possible outside of Next.js's build.

---

## Docker & Kubernetes

The app ships with a multi-stage `Dockerfile` (Next.js standalone output → ~150 MB image), a
`docker-compose.yml` for a local prod-like stack (app + Redis), and raw Kubernetes manifests under
`k8s/`. Supabase and Resend remain external managed services; **Redis runs in-cluster**.

### Build-time vs runtime environment (important)

`NEXT_PUBLIC_*` variables are **inlined into the client bundle at build time**, so they must be
passed as Docker **build args**. The server-only secrets are injected at **runtime**:

| Variable | When it's needed | How it's provided |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build **and** runtime | `--build-arg` + env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build time | `--build-arg` |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | env / K8s Secret |
| `REDIS_URL` | runtime | env / K8s ConfigMap |
| `RESEND_API_KEY` | runtime | env / K8s Secret |

### Docker (single container)

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t journalink:local .

docker run --rm -p 3000:3000 --env-file .env.local journalink:local
```

### Docker Compose (app + Redis)

Starts the app and a persistent Redis. This project keeps env vars in `.env.local`,
but Compose only auto-loads `.env`, so pass the file explicitly:

```bash
docker compose --env-file .env.local up --build
```

### Kubernetes

Manifests live in `k8s/` (namespace, ConfigMap, Secret, in-cluster Redis StatefulSet, app
Deployment, Service, Ingress, HPA, cert-manager ClusterIssuer, and a CronJob).

```bash
# 1. Push your image to a registry and set it in k8s/deployment.yaml
#    (replace `your-registry/journalink:latest`) — or let the CI/CD pipeline
#    do this for you (see below).

# 2. Install cert-manager (needed for the ClusterIssuer in k8s/cluster-issuer.yaml):
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml

# 3. Create the real secret (don't commit values). `k8s/secret.yaml.example` is a
#    template that is NOT applied by `kubectl apply -f k8s/`, so it can't overwrite
#    this secret:
kubectl create namespace journalink
kubectl -n journalink create secret generic journalink-secrets \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY='...' \
  --from-literal=RESEND_API_KEY='...' \
  --from-literal=CRON_SECRET='...' \
  --from-literal=METRICS_TOKEN='...'

# 4. Set NEXT_PUBLIC_SUPABASE_URL in k8s/configmap.yaml, then apply everything else:
kubectl apply -f k8s/

# 5. Check status / reach the app:
kubectl -n journalink get pods,svc,ingress,cronjob
kubectl -n journalink port-forward svc/journalink 8080:80
```

The `Ingress` assumes an ingress controller (e.g. ingress-nginx) and the `HPA` assumes
metrics-server; both are optional for a local minikube/kind run. TLS is issued by a
**self-signed** `ClusterIssuer` by default (no real domain needed — browsers will warn
about the untrusted cert, which is expected for local/portfolio use); see the comment
in `k8s/cluster-issuer.yaml` for switching to a real Let's Encrypt issuer later.

---

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. **`verify`** — `npm ci`, lint, typecheck, test, build. Always runs.
2. **`docker`** — builds the Dockerfile and pushes to `ghcr.io/<owner>/<repo>` tagged
   `latest` and the commit SHA. Only on pushes to `main`; only needs the built-in
   `GITHUB_TOKEN` (no extra registry account).
3. **`deploy`** — applies `k8s/` and rolls the new image out to a real cluster. Only
   on pushes to `main`, and **skips itself** (with a warning, not a failure) if the
   `KUBE_CONFIG` secret isn't set yet — so the pipeline stays green before you have a
   cluster to deploy to.

### One-time setup

- **Public build args** (optional, recommended): add repo **Variables** (Settings →
  Secrets and variables → Actions → *Variables* tab) named `NEXT_PUBLIC_SUPABASE_URL`
  and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are safe to store unencrypted — they're
  inlined into the client bundle anyway. Without them, the pipeline builds with
  placeholder values, which is enough for `verify` to pass but produces an image that
  can't reach your real Supabase project.
- **GHCR package visibility**: the first push creates a **private** package. Either
  make it public (package → Package settings → Danger Zone → Change visibility) or
  add an `imagePullSecret` to `k8s/deployment.yaml` pointing at a
  `docker-registry` secret created from a GitHub PAT with `read:packages`.
- **Deploying to a real cluster**: add a repo **Secret** named `KUBE_CONFIG` —
  a base64-encoded kubeconfig with access to your cluster:
  ```bash
  cat ~/.kube/config | base64 -w0   # -w0 avoids line wrapping
  ```
  Paste the output as the secret value. Before the first real deploy, install
  cert-manager and the `journalink-secrets` Secret in the cluster (see the
  Kubernetes section above) — `kubectl apply -f k8s/` will fail on the
  `ClusterIssuer` if cert-manager's CRDs aren't installed yet.

---

## Project Structure

```
journalink/
├── app/
│   ├── (auth)/           # Login/signup routes
│   ├── api/               # Route handlers (auth, posts, projects, applications, ...)
│   ├── applications/      # Application review (professors) / status (students)
│   ├── auth/              # OAuth callback
│   ├── feed/              # Main feed
│   ├── notifications/     # Notification list
│   ├── onboarding/        # New user onboarding
│   ├── posts/             # Single-post permalink view
│   ├── profiles/          # Profile search + profile pages
│   ├── projects/          # Project discovery, detail, and management
│   └── settings/          # Profile, appearance, and account settings
├── components/            # Feature and UI components
├── lib/                   # Supabase clients, Redis cache, email, and data-access helpers
└── types/                 # Shared TypeScript types
```

---

## Database Schema

Managed via Supabase (no in-repo migrations — schema lives in the Supabase dashboard):

- `profiles` — user profile data linked to Supabase Auth
- `project` — research projects posted by professors
- `applications` — student applications to projects
- `post` — feed posts
- `comments` — comments on posts
- `post_likes`, `post_reposts`, `post_bookmarks` — per-post user interactions
- `comment_reactions` — like/dislike on comments
- `follows` — follower/following relationships
- `notifications` — in-app notification records

A `confirm_application` Postgres function handles offer confirmation server-side; notification creation is also handled at the database level.

---

## Real-time Notifications

Notifications are pushed to the client over **Supabase Realtime** — a WebSocket connection that streams Postgres changes straight to the browser. There is no custom socket server (the app runs on Vercel's serverless platform, which has no long-lived process to host one).

**How it works:**

1. Postgres triggers insert rows into the `notifications` table when a user is liked, followed, commented on, mentioned, or their application changes state.
2. On the client, the `useNotificationsRealtime` hook (`components/notifications/useNotificationsRealtime.ts`) opens a Realtime channel and subscribes to `INSERT`/`UPDATE` events on the `notifications` table, filtered to `recipient_id = <current user>`.
3. The nav bell badge (`NavNotificationBell`) and the full list (`NotificationList`) refetch the instant an event arrives, so updates appear within about a second — no refresh needed.
4. A 60-second poll plus an on-window-focus refetch stay in place as a fallback if the socket drops.

Delivery respects Row Level Security, so a client only ever receives its own notifications.

**Supabase setup (one-time, in the dashboard):**

```sql
-- 1. Add the table to the Realtime publication so changes are broadcast
alter publication supabase_realtime add table public.notifications;

-- 2. Ensure an RLS policy lets a user read their own notifications
--    (Realtime delivery is gated by the same SELECT policy)
create policy "Users read own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());
```

---

## Resilience (Circuit Breakers)

`lib/circuitBreaker.ts` is a small, generic circuit breaker (timeout race +
failure-threshold trip + cooldown + half-open probe), used twice in `lib/redis.ts`:

- **Redis breaker** — 150ms timeout, opens after 3 failures, 10s cooldown. While
  open, cache reads/writes are skipped entirely and the app falls back to the
  database — a degraded cache never adds latency to a request.
- **DB breaker** — wraps the fetcher passed to every `cacheGetOrSet` call. 4s
  timeout, opens after 3 failures, 5s cooldown. Unlike the Redis breaker there's no
  lower fallback (the DB *is* the source of truth), so this exists to bound latency
  and fail fast: once open, calls throw `ServiceUnavailableError` immediately instead
  of hanging for 4s each. `app/api/feed` and `app/api/search` catch it and return
  `503` with `Retry-After`; other routes let it surface as a `500` (still fast,
  still logged) — the pattern is there to extend to more routes as needed.

Both breakers log state transitions (`lib/logger.ts`) and increment
`journalink_circuit_breaker_trips_total` (`lib/metrics.ts`).

## Observability

- **Structured logging** (`lib/logger.ts`) — one JSON line per call (`level`,
  `message`, ISO `time`, arbitrary metadata) to stdout/stderr, which is what
  `kubectl logs` and any container log driver already capture.
- **Metrics** (`lib/metrics.ts`) — a hand-rolled, in-process Prometheus registry
  (counters + a histogram, no dependency) exposed at `GET /api/metrics`:
  cache hit/miss rate by key prefix, circuit breaker trips, rate-limit blocks, and
  an HTTP request duration histogram. Gated by a bearer token (`METRICS_TOKEN`) since
  the Ingress would otherwise expose it publicly:
  ```bash
  curl -H "Authorization: Bearer $METRICS_TOKEN" https://your-host/api/metrics
  ```
  Point an in-cluster Prometheus at it with the same `bearer_token` in its scrape
  config. Metrics are per-pod in-process state — normal for Prometheus (it scrapes
  and aggregates across pods), not a limitation of this setup.

## Scheduled Posts

A scheduled post (`scheduled_at` in the future) is already hidden/shown correctly by
the `scheduled_at` filter every read applies (see `lib/posts.ts`) — no worker is
needed for *correctness*. What's missing without one: the feed/author cache doesn't
know a post just became visible until its TTL naturally expires (up to 45s for the
feed, up to 5 minutes for an author's own page).

The `journalink-publish-scheduled` CronJob (`k8s/cronjob.yaml`) closes that gap: every
2 minutes it calls `POST /api/internal/publish-scheduled` (authenticated with
`CRON_SECRET`), which finds posts whose schedule passed in the last 3 minutes and
invalidates the relevant cache entries — idempotent, safe to re-run, no new DB state.

---

## Notes

- The Resend sender currently uses Resend's shared sandbox domain, which only delivers to the account owner — a verified custom domain is needed before password-reset emails reach real users.
