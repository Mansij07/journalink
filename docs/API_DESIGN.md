# JournaLink — API Design & Architecture

A complete reference for how JournaLink's backend is built: every API endpoint, the data model behind it, and the caching/auth/resilience/deployment architecture that ties it together. This document is a technical reference; for setup and feature descriptions see [`README.md`](../README.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Model](#4-data-model)
5. [Service / Data-Access Layer](#5-service--data-access-layer)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Full API Reference](#7-full-api-reference)
8. [Validation Conventions](#8-validation-conventions)
9. [Rate Limiting](#9-rate-limiting)
10. [Caching Architecture](#10-caching-architecture)
11. [Resilience (Circuit Breakers)](#11-resilience-circuit-breakers)
12. [Realtime](#12-realtime)
13. [Background Jobs](#13-background-jobs)
14. [Observability](#14-observability)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Environment Variables Reference](#16-environment-variables-reference)
17. [Known Gaps / Conventions Worth Noting](#17-known-gaps--conventions-worth-noting)

---

## 1. Overview

JournaLink is a full-stack **Next.js 16 (App Router)** application — there is no separate backend service and no monorepo. **Supabase** is the actual backend: it provides the Postgres database, authentication, file storage, and realtime (WebSocket) delivery. The Next.js **API route handlers** under `app/api/**/route.ts` are a thin server layer on top of Supabase that adds:

- Session-based authorization (re-checked per request)
- Redis caching for expensive/frequent reads (cache-aside)
- Rate limiting on write-heavy or abuse-prone endpoints
- Business rules that don't belong in the client (allow-listed field updates, ownership checks, cache invalidation)
- A couple of machine-to-machine endpoints for infrastructure (metrics scraping, a cron-triggered cache nudge)

Almost all "real" authorization is enforced twice: once by explicit `.eq(owner_id, user.id)`-style filters in route code, and again by Postgres **Row-Level Security (RLS)** policies at the database layer, so a bug in the route code cannot fully bypass access control.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), API routes as Route Handlers |
| Language | TypeScript throughout |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Animation | GSAP, Framer Motion |
| Backend & Auth | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Caching / rate limiting | Redis (`ioredis`) |
| Email | Resend |
| Testing | Vitest (unit tests for `lib/*`, run against mocked Redis) |
| CI/CD | GitHub Actions — lint → typecheck → test → build → image → deploy |
| Deployment | Docker / Kubernetes (this repo's built-out path), or Vercel |

There is **no ORM** (no Prisma/Drizzle/Mongoose) — the Supabase JS client (`@supabase/supabase-js` / `@supabase/ssr`) is used directly as a PostgREST query builder, and schema lives in the Supabase dashboard, not as in-repo migrations.

## 3. System Architecture

### Request lifecycle

```
Browser
  │
  ▼
proxy.ts  (page-level auth/onboarding gate — NOT applied to /api/*)
  │
  ▼
app/api/**/route.ts  (Route Handler)
  ├─ 1. createClient() → supabase.auth.getUser()  → 401 if no user
  ├─ 2. rateLimit(key, limit, window)              → 429 if exceeded   (only on some routes)
  ├─ 3. parse + validate request body/query        → 400 if invalid
  ├─ 4. delegate to lib/*.ts service function
  │        ├─ read  → cacheGetOrSet() (Redis, cache-aside)  → Supabase (Postgres, RLS-scoped)
  │        └─ write → Supabase insert/update/delete or RPC  → invalidate*() busts affected cache keys
  └─ 5. NextResponse.json(data | { ok: true } | { error })
```

### Layering

- **Routes** (`app/api/**/route.ts`) — one file per resource/action. Each route repeats its own auth check; there is no shared `withAuth()` middleware wrapper.
- **Services** (`lib/*.ts`) — one file per domain (`posts.ts`, `profile.ts`, `projects.ts`, `social.ts`, `applications.ts`). Every service file starts with `import "server-only"` (a compile-time guard that fails the build if accidentally imported into client code) and takes the request-scoped `SupabaseClient` as its first argument so RLS context flows through from the caller's session.
- **Supabase** — Postgres (RLS-protected tables + `SECURITY DEFINER` RPCs for multi-step transactions), Auth, Storage, Realtime.
- **Redis** — cache-aside reads (`cacheGetOrSet`) and a separate rate-limit counter, both behind circuit breakers.

### Notably absent

- **No API versioning** — no `/api/v1` prefix or version header anywhere.
- **No shared request-validation library** — no Zod/Joi/Yup; every route hand-rolls `typeof`/`Array.isArray` checks and field allow-lists.
- **No centralized API auth middleware** — `proxy.ts` (Next's `middleware.ts`, renamed in this Next.js version) only gates **pages** (`/feed`, `/projects`, `/profiles`, `/notifications`, `/applications`, `/posts`, `/login`, `/signup`, `/onboarding`); every `/api/*` route independently calls `supabase.auth.getUser()`.
- **No in-repo DB migrations** — schema changes are made directly in the Supabase dashboard.

## 4. Data Model

All tables are Postgres, managed via the Supabase dashboard, protected by RLS. Types below are mirrored by hand in [`lib/types.ts`](../lib/types.ts).

### `profiles`
Linked 1:1 to `auth.users`. One row per user.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | FK → `auth.users.id` |
| `username` | text \| null | URL handle, unique, `^[A-Za-z0-9_]{3,30}$` |
| `role` | `"Student"` \| `"Prof"` \| null | null until onboarding completes |
| `full_name` | text \| null | |
| `avatar_url` | text \| null | Supabase Storage `avatars` bucket URL |
| `bio` | text \| null | |
| `branch` | text \| null | |
| `year` | int \| null | drives `acceptCapForYear` |
| `skills` | text[] \| null | |
| `links` | jsonb \| null | map of link label → URL |

### `project`
Research projects posted by professors.

| Field | Type | Notes |
|---|---|---|
| `id` | int (PK) | |
| `professor_id` | uuid | FK → `profiles.id` (owner) |
| `title` | text | required |
| `type` | text \| null | |
| `status` | `"Open"` \| `"Closed"` | auto-closed by `shouldAutoClose` / `closeExpiredProjects` |
| `description`, `requirements` | text \| null | |
| `skills` | text[] \| null | |
| `slots` | int \| null | remaining capacity |
| `deadline` | date string \| null | `yyyy-MM-dd` |
| `resume_required` | boolean | gates application submission |
| `created_at` | timestamp | |

Joined view `ProjectWithProfessor` embeds the owner via PostgREST: `*, profiles!professor_id ( id, username, full_name, avatar_url, role )`.

### `applications`
A student's application to a project.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | int | FK → `project.id` |
| `applicant_id` | uuid | FK → `profiles.id` |
| `message` | text \| null | applicant's note |
| `decision_message` | text \| null | professor's note on accept/reject |
| `resume_url` | text \| null | must live under `/storage/v1/object/public/resumes/` |
| `status` | `pending \| accepted \| rejected \| confirmed \| declined \| left` | |
| `leave_requested` | boolean | |
| `created_at`, `updated_at` | timestamp | |

Status transitions are partly enforced by `SECURITY DEFINER` Postgres RPCs (see the "Projects & applications" endpoints in [§7](#7-full-api-reference)), not just application code:
- `confirm_application(p_application_id)` — accepted → confirmed, enforces the year-based accept cap server-side, occupies a project slot.
- `decline_application(p_application_id)` — accepted → declined, caller must be the applicant.
- `request_leave(p_application_id)` — sets `leave_requested`, caller must be the applicant.
- `resolve_leave_request(p_application_id, p_approve)` — approve → `left` (frees a slot) or deny → clears the flag; caller must own the project.

### `post`
Feed posts.

| Field | Type | Notes |
|---|---|---|
| `id` | int/uuid (PK) | |
| `author_id` | uuid | FK → `profiles.id` |
| `content` | text | |
| `media` | jsonb array \| undefined | Storage URLs |
| `category` | text | currently always `"Announcement"` on create |
| `scheduled_at` | timestamp \| null | future posts hidden until this passes |
| `created_at` | timestamp | |

### `comments` / `comment_reactions`
- `comments`: `id`, `post_id` (FK), `author_id` (FK), `content`, `created_at`.
- `comment_reactions`: `comment_id` + `user_id` (unique together, `onConflict: "comment_id,user_id"`), `value` (`"like"` \| `"dislike"`).

### `post_likes`, `post_reposts`, `post_bookmarks`
Identical shape: `post_id` (FK), `user_id` (FK). One row per user per post per interaction type.

### `follows`
`follower_id`, `following_id` — both FK → `profiles.id`. The social graph.

### `notifications`
Rows are inserted by **Postgres triggers**, not application code — e.g. liking a post, following someone, commenting, an application status change, or an @-mention all insert a notification row at the DB layer.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `recipient_id` | uuid | who sees it |
| `actor_id` | uuid | who caused it |
| `type` | `like \| follow \| comment \| application_new \| application_accepted \| application_rejected \| mention` | |
| `post_id`, `project_id`, `application_id` | nullable FKs | whichever is relevant to `type` |
| `read` | boolean | |
| `created_at` | timestamp | |

### `recent_searches`
`user_id`, `viewed_id` (unique together via `onConflict: "user_id,viewed_id"`), `created_at` — refreshed (upserted) each time a profile is viewed.

## 5. Service / Data-Access Layer

`lib/*.ts` is the data-access/business-logic layer between routes and Supabase:

| File | Responsibility |
|---|---|
| `lib/posts.ts` | Feed page, author page, single post — cache-aside reads + `invalidateFeedAndAuthor` / `invalidatePost` |
| `lib/profile.ts` | Profile read/cache, `isProfileComplete`, `acceptCapForYear` |
| `lib/projects.ts` | Open/owner project lists, project detail, `shouldAutoClose`, `closeExpiredProjects` (admin-client sweep run before every list/detail read) |
| `lib/social.ts` | Follow counts/ids, mention candidates, followers/following lists, "who to follow" suggestions, recent searches |
| `lib/applications.ts` | Professor/student application lists (cached) and per-project list (uncached, on-demand) |
| `lib/redis.ts` | `cacheGetOrSet` / `cacheDelete` / `cacheDeleteByPrefix` — the caching primitive every other service builds on |
| `lib/rateLimit.ts` | Redis-backed fixed-window limiter |
| `lib/circuitBreaker.ts` | Generic circuit breaker used by both Redis and DB calls |
| `lib/authGate.ts` | Pure, framework-free auth/onboarding redirect logic, used by `proxy.ts` |
| `lib/metrics.ts` / `lib/logger.ts` | In-process Prometheus registry / structured JSON logging |
| `lib/email.ts` | Resend wrapper (`sendPasswordResetEmail`) |
| `lib/supabase/{client,server,admin}.ts` | Supabase client factories — browser, cookie-bound server (RLS-scoped), and service-role admin (RLS-bypassing) |

Routes generally follow: auth check → (rate limit) → validate → call a `lib/*.ts` read/write function → on writes, call the matching `invalidate*` to bust cache. Routes almost never touch Redis directly — the two exceptions are password-reset token issuance/lookup (`redis.set`/`get`/`del` for `pwreset:{token}` keys, directly in the auth routes) and rate limiting.

## 6. Authentication & Authorization

### Identity
Supabase Auth — email/password or GitHub/Google OAuth. Sessions are cookie-based via `@supabase/ssr`. `app/auth/callback/route.ts` exchanges an OAuth `code` for a session (`exchangeCodeForSession`) and routes first-time OAuth users to `/onboarding` if their profile still has the trigger-assigned default username (email local-part).

### Per-request check (every `/api/*` route)
```ts
const supabase = await createClient()          // lib/supabase/server.ts — cookie-bound, RLS-scoped
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```
This exact pattern is repeated in every route file — there is no shared wrapper/middleware for it.

### Page-level gate (`proxy.ts` + `lib/authGate.ts`)
Next's middleware equivalent, scoped by `config.matcher` to a specific set of pages (not `/api/*`). Resolves one of three states via the pure function `resolveGateRedirect`:
- Unauthenticated + non-public path → redirect to `/login`
- Authenticated but onboarding incomplete (see `isOnboardingComplete`) + not already in the onboarding/auth flow → redirect to `/onboarding`
- Fully onboarded but on an auth page (`/login`, `/signup`, `/onboarding`) → redirect to `/feed`

`isOnboardingComplete` treats every email/password signup as complete (username + role collected at signup), but requires an OAuth signup to have replaced its trigger-assigned default username and set a role.

### Authorization model
1. **Ownership filters in route code** — e.g. `.eq("author_id", user.id)`, `.eq("professor_id", user.id)`, `.eq("applicant_id", user.id)` on updates/deletes.
2. **Row-Level Security policies** in Postgres — the second, DB-enforced layer behind every table.
3. **`SECURITY DEFINER` RPCs** for the four application-status transitions (`confirm_application`, `decline_application`, `request_leave`, `resolve_leave_request`) — these run with elevated DB privileges but internally check `auth.uid()` against the row, so multi-step/cross-table transitions (like freeing a project slot) stay atomic and correct without trusting the client.

### Privileged (service-role) access
`lib/supabase/admin.ts` creates a client with `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS**. Used only in:
- `POST /api/follows/remove-follower` — RLS only lets a user delete follow-rows they authored, but removing a follower means deleting *someone else's* row, scoped in code to `following_id = <current user>`.
- `POST /api/auth/forgot-password` / `POST /api/auth/reset-password` — no session exists yet during password reset.
- `POST /api/internal/publish-scheduled` — cron-triggered, no user session at all.
- `lib/projects.ts`'s `closeExpiredProjects()` — RLS restricts project `UPDATE` to the owning professor, but the auto-close sweep must run for any viewer's read.

### Machine-to-machine auth (non-user bearer tokens)
Two endpoints are gated by a static shared secret instead of a user session:

| Endpoint | Secret | Caller |
|---|---|---|
| `GET /api/metrics` | `METRICS_TOKEN` | In-cluster Prometheus |
| `POST /api/internal/publish-scheduled` | `CRON_SECRET` | Kubernetes CronJob `journalink-publish-scheduled` |

Both check `Authorization: Bearer <token>` against the corresponding env var and return `401` on mismatch or if the env var is unset.

## 7. Full API Reference

**Conventions used throughout:** all bodies are JSON unless noted (uploads use `multipart/form-data`); a malformed JSON body returns `400 { "error": "Invalid JSON body" }`; every route returns `401 { "error": "Unauthorized" }` if `auth.getUser()` finds no session (except the two bearer-token-gated infra routes and the two pre-session auth routes); success responses are either the requested data or `{ "ok": true }`; failures are always `{ "error": string }` with an appropriate status code.

### Social graph

#### `POST /api/follows`
Follow a user.
- **Auth:** required
- **Body:** `{ "targetId": string }`
- **Response:** `{ "ok": true }`
- **Errors:** `400` missing `targetId` or insert failure (e.g. already following)
- Invalidates: follow counts/suggestions/following-ids/mentions for both users (`invalidateFollow`)

#### `DELETE /api/follows`
Unfollow a user. Same body/response/invalidation shape as `POST`, deletes the `follows` row instead.

#### `GET /api/follows/list`
Followers or following list for any profile (read-only, viewable by any signed-in user).
- **Auth:** required
- **Query:** `userId` (required), `type` = `"followers"` \| `"following"` (required)
- **Response:** `{ "people": Suggestion[] }`
- **Errors:** `400` if `userId`/`type` missing or invalid
- Uncached — reflects follow/unfollow immediately.

#### `POST /api/follows/remove-follower`
Force-remove one of your own followers (uses the admin client since RLS won't let the followee delete the follower's row).
- **Auth:** required
- **Body:** `{ "followerId": string }`
- **Response:** `{ "ok": true }`
- Scoped to `following_id = <current user>` so it can never remove someone else's follower.

### Posts & engagement

#### `GET /api/posts`
One cached page of a single author's posts.
- **Auth:** required
- **Query:** `author` (required), `page` (default `0`)
- **Response:** `{ posts: PostRow[], hasMore: boolean }`
- Only the author sees their own future-`scheduled_at` posts (`includeScheduled = author === user.id`).
- Cached via `getAuthorPostsPage` (5 min TTL).

#### `POST /api/posts`
Create a post.
- **Auth:** required
- **Rate limit:** `posts:create:{userId}` — 10 / 5 min
- **Body:** `{ content: string (required, trimmed non-empty), media?: array, scheduledAt?: ISO string (must be future) }`
- **Response:** `{ "id": string }`
- **Errors:** `429` rate-limited; `400` empty content, unparseable/past `scheduledAt`, or insert failure
- Invalidates: all feed pages + the author's post pages (`invalidateFeedAndAuthor`)

#### `GET /api/posts/[id]`
Single post + its author profile, for the permalink view.
- **Auth:** required
- **Response:** `{ ...post, profiles: Profile | null }`
- **Errors:** `404` if not found, or if `scheduled_at` is in the future and the viewer isn't the author
- Post row cached 1 hr (`getPostById`); author profile via the separately-cached `getProfileById` (so profile edits show immediately).

#### `DELETE /api/posts/[id]`
Delete your own post.
- **Auth:** required (must be `author_id`)
- **Response:** `{ "ok": true }`
- **Errors:** `404` if not found or not owned
- Invalidates feed + author cache.

#### `GET/POST/DELETE /api/posts/[id]/likes`
- `GET` → `{ count: number, liked: boolean }` (uncached, always live)
- `POST` → insert into `post_likes` → `{ "ok": true }`
- `DELETE` → remove the current user's like → `{ "ok": true }`

#### `GET/POST/DELETE /api/posts/[id]/reposts`
Identical shape to `likes`, backed by `post_reposts`. `GET` → `{ count, reposted }`.

#### `GET/POST/DELETE /api/posts/[id]/bookmarks`
Same pattern, backed by `post_bookmarks`, no count. `GET` → `{ bookmarked: boolean }`.

#### `GET /api/posts/[id]/comments`
- **Auth:** required
- **Query:** `countOnly` (optional) — if present, returns `{ count: number }` only (for a reply-count badge), skipping the full fetch.
- **Response (full):** `{ comments: (Comment & { profiles: Profile | null })[] }`, oldest first
- Never cached — comments stay live.

#### `POST /api/posts/[id]/comments`
Add a comment.
- **Body:** `{ content: string (required, trimmed) }`
- **Response:** `{ "ok": true }`

#### `GET /api/comments/[id]/reactions`
- **Response:** `{ likes: number, dislikes: number, mine: "like" | "dislike" | null }`

#### `POST /api/comments/[id]/reactions`
Set/switch your reaction.
- **Body:** `{ value: "like" | "dislike" }` (400 if neither)
- Upserts on `(comment_id, user_id)` — one reaction per user per comment.

#### `DELETE /api/comments/[id]/reactions`
Remove your reaction on a comment.

### Notifications

#### `GET /api/notifications`
- **Auth:** required
- **Query:** `limit`, `offset` — if `limit` is omitted/zero, returns the most recent 50 with no offset; if provided, paginates via `.range(offset, offset + limit - 1)`.
- **Response:** `{ notifications: NotificationRow[] }`, each with the embedded actor profile (`actor:profiles!actor_id`), newest first.

#### `PATCH /api/notifications`
Mark **all** of the current user's unread notifications read. No body. → `{ "ok": true }`

#### `PATCH /api/notifications/[id]`
Mark a single notification read. No body, no ownership check beyond RLS. → `{ "ok": true }`

#### `GET /api/notifications/unread-count`
- **Response:** `{ count: number }` — for the nav bell badge.

### Auth flows

#### `POST /api/auth/forgot-password`
Request a password-reset email.
- **Auth:** none (pre-session)
- **Rate limit:** `pwreset-request:{email}` — 5 / 15 min, keyed by the *target* email (not caller/IP), to stop one address being email-bombed
- **Body:** `{ email: string }`
- **Response:** always the same generic message regardless of outcome — `{ "message": "If an account exists for that email, a reset link is on its way." }` — even when rate-limited or the account doesn't exist, to prevent account enumeration
- **Mechanism:** looks up the user via the admin client's `listUsers` (first page, 1000/page), generates a `randomUUID()` token, stores `pwreset:{token} → userId` in Redis with a 1 hour TTL, emails a reset link via Resend
- **Errors:** `400` invalid body/missing email; `500` on unexpected failure (logged, not exposed)

#### `POST /api/auth/reset-password`
Apply a new password using a valid one-time token.
- **Auth:** none (the token *is* the credential)
- **Body:** `{ token: string, password: string (min 6 chars) }`
- **Response:** `{ "message": "Password updated successfully." }`
- **Mechanism:** looks up `pwreset:{token}` in Redis → if found, uses the admin client's `updateUserById` to set the password, then deletes the Redis key (single-use)
- **Errors:** `400` missing token / too-short password / expired-or-invalid token; `500` on Redis or Supabase failure

#### `GET /auth/callback` *(not under `/api`)*
OAuth redirect target.
- **Query:** `code` (from the OAuth provider)
- Exchanges the code for a session, checks whether the profile still has its trigger-assigned default username, and redirects to `/onboarding` (first-time OAuth) or `/feed`.

### Profile / search / mentions

#### `GET /api/profile`
The current user's own profile (from cache).
- **Response:** `Profile` object directly (not wrapped)

#### `PATCH /api/profile`
Update the current user's profile.
- **Allowed fields:** `full_name, bio, branch, year, skills, avatar_url, username, role` — any other key in the body is silently dropped
- **Body:** partial `Profile`; at least one allowed field must be present (`400` otherwise)
- **Validation:** `username`, if present, must match `/^[A-Za-z0-9_]{3,30}$/` after trimming (`400` with a descriptive message otherwise)
- **Response:** the updated `Profile` row
- Invalidates both the id-keyed and username-keyed profile cache entries.

#### `GET /api/search?q=`
Profile typeahead.
- **Rate limit:** `search:{userId}` — 30 / 60s
- **Query:** `q` — empty/missing returns `{ profiles: [] }` immediately (no cache lookup)
- **Response:** `{ profiles: Profile[] }` (top 5, matched on `username`/`full_name` via `ilike`)
- Cached 2 min per lowercased query (`search:{q}`).
- **Errors:** `429` rate-limited; `503` with `Retry-After: 5` if the DB circuit breaker is open (`ServiceUnavailableError`)

#### `GET /api/mentions`
Candidate pool for @-mention autocomplete — profiles the current user follows (client filters by typed text).
- **Response:** `{ profiles: MentionCandidate[] }`
- Cached 10 min per user, busted by `invalidateFollow` on follow/unfollow.

#### `GET /api/recent-searches`
- **Response:** `{ recent: Suggestion[] }` — profiles the current user recently viewed, most recent 6, cached 10 min.

#### `POST /api/recent-searches`
Record a profile view.
- **Body:** `{ profileId: string }`
- Upserts on `(user_id, viewed_id)`, refreshing `created_at`. No-ops if `profileId === userId`.

#### `DELETE /api/recent-searches`
Clear all of the current user's recent searches.

### Projects & applications

#### `POST /api/projects`
Create a project (professors).
- **Allowed fields:** `title, type, description, requirements, skills, slots, deadline, status, resume_required`
- **Body:** must include `title` (`400` otherwise)
- Auto-sets `status: "Closed"` on create if `shouldAutoClose(deadline, slots)` is already true.
- **Response:** `{ "id": number }`
- Invalidates the open-projects list, the owner's project lists, and the owner's project count.

#### `PATCH /api/projects/[id]`
Update a project you own.
- Same allowed-field list as create; `400` if none present.
- Auto-closes if the new `deadline`/`slots` values already qualify (also blocks manually reopening an expired project).
- **Auth/ownership:** `.eq("professor_id", user.id)` + RLS; `404` if not found or not owned (`maybeSingle()` returns `null`, not a thrown error).
- **Response:** `{ "id": string }`

#### `DELETE /api/projects/[id]`
Delete a project you own. Same ownership/404 semantics as `PATCH`. → `{ "ok": true }`

#### `GET /api/projects/[id]/viewer-state`
Per-viewer personalization for the project detail page (the page itself is a shared, cache-friendly shell; this fills in what depends on who's looking).
- **Response:**
  ```json
  {
    "userId": string,
    "isOwner": boolean,
    "isStudent": boolean,
    "profileComplete": boolean,
    "applied": boolean,
    "applicationStatus": string | null,
    "applicationCount": number,
    "acceptCap": number,
    "atCap": boolean
  }
  ```
- Uncached (inherently personalized); the underlying project row it reads (`getProjectById`) is cached 15 min.

#### `POST /api/applications`
Apply to a project (students).
- **Body:** `{ projectId: number, message?: string, resumeUrl?: string }`
- **Validation:**
  - `resumeUrl` accepted only if it contains `/storage/v1/object/public/resumes/` (must be our own bucket)
  - Rejects if the applicant is already at their year's confirmed-project cap (`acceptCapForYear`)
  - Rejects if the project requires a resume and none was provided
  - `23505` (unique violation) from Postgres → `"You have already applied to this project."`
- **Response:** `{ "id": string }`
- Invalidates both the applicant's and the project owner's cached application lists.

#### `PATCH /api/applications/[id]`
Accept/reject (professor) or student-side status change.
- **Body:** `{ status: "pending" | "accepted" | "rejected" | "declined", message?: string }`
- **Response:** `{ "ok": true }`
- **Errors:** `400` invalid status; `403` if RLS blocked the update (no rows matched — "Not permitted or not found")
- `decision_message` is stored alongside the status change.

#### `DELETE /api/applications/[id]`
Withdraw your own still-`pending` application (undo a just-submitted apply).
- **Auth:** must be the applicant, and status must still be `pending`
- **Errors:** `404` if not found/not permitted/not pending
- **Response:** `{ "ok": true }`

#### `POST /api/applications/[id]/confirm`
Student confirms an accepted offer, via the `confirm_application` RPC (enforces the accept cap atomically server-side).
- **Response:** `{ "ok": true }`
- **Errors:** `400` with the RPC's error message (e.g. cap exceeded)
- Invalidates the affected project's caches (slot count changed) and both sides' application lists.

#### `POST /api/applications/[id]/decline`
Student declines an accepted offer, via `decline_application` RPC (caller must be the applicant; row must be `accepted`).
- **Response:** `{ "ok": true }`
- No project cache invalidation — declining occupies no slot.

#### `POST /api/applications/[id]/leave`
Student requests to leave a confirmed project, via `request_leave` RPC. Row stays `confirmed` (slot still occupied) until the professor resolves it.
- **Response:** `{ "ok": true }`
- Invalidates both sides' application lists (the `leave_requested` flag is now visible).

#### `PATCH /api/applications/[id]/leave`
Professor approves/denies a leave request, via `resolve_leave_request` RPC.
- **Body:** `{ approve: boolean }` (`400` if not boolean)
- Approve → status `left`, frees the slot, also invalidates the project's caches. Deny → clears `leave_requested`, only application-list caches are busted.
- **Response:** `{ "ok": true }`

### Uploads

#### `POST /api/uploads`
Server-mediated file upload to Supabase Storage.
- **Auth:** required
- **Rate limit:** `uploads:{userId}` — 20 / 5 min
- **Body:** `multipart/form-data` — `file` (required), `bucket` ∈ `avatars | post-media | resumes`, `kind` ∈ `avatar | image | video | doc | resume`
- **Path derivation:** always server-side from `user.id` (never trusts a client-supplied path) — the user id is the first path segment so Supabase Storage's "own folder" RLS policy (`(storage.foldername(name))[1] = auth.uid()`) permits the write. `resumes` bucket disables `upsert` (its storage policy grants INSERT only, not UPDATE/SELECT).
- **Response:** `{ url: string, path: string }` (public URL + storage path)
- **Errors:** `429` rate-limited; `400` missing file / invalid bucket / storage error

### Feed

#### `GET /api/feed`
One cached page of the global (all-users) feed.
- **Auth:** required
- **Query:** `page` (default `0`)
- **Response:** `{ posts: PostRow[], hasMore: boolean }` — each post has its author profile embedded
- Cached 45s (global key, not personalized), hides future-`scheduled_at` posts.
- **Errors:** `503` with `Retry-After: 5` if the DB circuit breaker is open

### Infra / internal (non-user auth)

#### `GET /api/metrics`
Prometheus text-exposition scrape endpoint.
- **Auth:** `Authorization: Bearer <METRICS_TOKEN>` — NOT a user session; `401` on missing/mismatched token or unset env var.
- **Response:** `text/plain; version=0.0.4` body — see [§14](#14-observability) for the metric list.

#### `POST /api/internal/publish-scheduled`
Cache-invalidation nudge for posts whose `scheduled_at` just passed.
- **Auth:** `Authorization: Bearer <CRON_SECRET>` — NOT a user session.
- **Mechanism:** queries (via admin client) posts with `scheduled_at` in the last 3 minutes (`LOOKBACK_MS`, deliberately ≥ the CronJob's 2-minute interval so no post's window falls entirely between two runs), then calls `invalidateFeedAndAuthor` per distinct author. Idempotent — safe to call repeatedly.
- **Response:** `{ published: number, authors: number }`
- Called every 2 minutes by the `journalink-publish-scheduled` Kubernetes CronJob.

## 8. Validation Conventions

There is no schema-validation library anywhere in the codebase (`package.json` has no Zod/Joi/Yup, and none is imported). Every route validates manually and consistently in this order:

1. **JSON parse guard** — `try { await request.json() } catch { return 400 }`.
2. **Type narrowing** — `typeof x === "string"`, `Array.isArray(x)`, with bodies typed loosely as `{ field?: unknown }` so nothing is trusted by default.
3. **Field allow-lists** for partial updates — `ALLOWED_FIELDS` constants restrict what a `PATCH` can touch, e.g.:
   - `app/api/profile/route.ts` — `full_name, bio, branch, year, skills, avatar_url, username, role`
   - `app/api/projects/route.ts` / `app/api/projects/[id]/route.ts` — `title, type, description, requirements, skills, slots, deadline, status, resume_required`
4. **One regex constant** — `USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/` in `app/api/profile/route.ts`.
5. **Database constraints as a second line of defense** — uniqueness (`23505` handled explicitly for duplicate applications), RLS policies, and `SECURITY DEFINER` RPCs enforce invariants that would otherwise need a validation layer (e.g. only the applicant can decline their own offer).

Each route defines and re-validates its own body shape independently — there is no shared `lib/validations` module.

## 9. Rate Limiting

Implemented in `lib/rateLimit.ts`: an atomic Redis **fixed-window counter** via a single Lua `EVAL` (`INCR` then `PEXPIRE` on the first hit only), so concurrent requests to the same key never race between increment and expiry. **Fails open** — if Redis is unreachable, the limiter logs a warning and allows the request, prioritizing availability over strict limiting (the same tradeoff `lib/redis.ts` makes for caching).

| Route | Key | Limit | Window |
|---|---|---|---|
| `POST /api/posts` | `posts:create:{userId}` | 10 | 5 min |
| `GET /api/search` | `search:{userId}` | 30 | 60 s |
| `POST /api/uploads` | `uploads:{userId}` | 20 | 5 min |
| `POST /api/auth/forgot-password` | `pwreset-request:{email}` | 5 | 15 min |

On block: `429` with a `Retry-After: {windowSeconds}` header, and the `journalink_rate_limit_blocked_total` counter (labeled by the key's prefix, e.g. `posts`, `search`) is incremented.

## 10. Caching Architecture

`lib/redis.ts` implements cache-aside via `cacheGetOrSet<T>(key, ttlSeconds, fetcher)`:
1. Read `key` from Redis (under the Redis circuit breaker) — on a hit, JSON-parse and return, incrementing `cacheHits`.
2. On a miss (or breaker-open/corrupt-entry), call `fetcher()` under the **DB circuit breaker**, incrementing `cacheMisses`.
3. Cache the result with `SET key value EX ttlSeconds` — but **never cache `null`/`undefined`** (no negative caching).
4. If the DB breaker is open, throw `ServiceUnavailableError` instead of calling `fetcher` — routes that care (`feed`, `search`) catch this and return `503`.

`cacheDelete(...keys)` and `cacheDeleteByPrefix(prefix)` (non-blocking `SCAN` + `DEL`, for busting whole key families like `feed:page:*`) are the invalidation primitives every `invalidate*` function in `lib/*.ts` is built from.

### Cached reads and TTLs

| Data | Key pattern | TTL | Service |
|---|---|---|---|
| Feed page | `feed:page:{n}` | 45 s | `lib/posts.ts` `getFeedPage` |
| Author's post page | `posts:author:{authorId}:{own\|page}:{n}` | 5 min | `lib/posts.ts` `getAuthorPostsPage` |
| Single post | `post:{id}` | 1 hr | `lib/posts.ts` `getPostById` |
| Profile by id | `profile:id:{id}` | 1 hr | `lib/profile.ts` `getProfileById` |
| Profile by username | `profile:username:{username}` | 1 hr | `lib/profile.ts` `getProfileByUsername` (also warms the id-keyed entry) |
| Open projects | `projects:open` | 5 min | `lib/projects.ts` `getOpenProjects` |
| Owner's projects | `projects:owner:{id}[:open]` | 5 min | `lib/projects.ts` `getOwnerProjects` |
| Project detail | `project:{id}` | 15 min | `lib/projects.ts` `getProjectById` |
| Follow counts | `count:follow:{id}` | 10 min | `lib/social.ts` `getFollowCounts` |
| Following ids | `following:ids:{id}` | 10 min | `lib/social.ts` `getFollowingIds` |
| Mention candidates | `mentions:{userId}` | 10 min | `lib/social.ts` `getMentionCandidates` |
| Project count | `count:projects:{id}` | 10 min | `lib/social.ts` `getProjectCount` |
| "Who to follow" suggestions | `suggestions:{userId}` | 10 min | `lib/social.ts` `getSuggestions` |
| Recent searches | `recent:{userId}` | 10 min | `lib/social.ts` `getRecentSearches` |
| Professor's applications | `applications:prof:{professorId}` | 60 s | `lib/applications.ts` `getProfessorApplications` |
| Student's applications | `applications:student:{applicantId}` | 60 s | `lib/applications.ts` `getStudentApplications` |
| Profile search results | `search:{query}` | 2 min | `app/api/search/route.ts` |

Deliberately **not cached**: comments (must stay live), likes/reposts/bookmarks GETs (always live counts), `viewer-state` (inherently personalized), followers/following lists (must reflect removals instantly), per-project application list (`getProfessorApplicationsForProject`, opened on demand).

Password-reset tokens use Redis directly (not `cacheGetOrSet`) as a one-time key-value store: `pwreset:{token} → userId`, `EX 3600`, deleted on use.

## 11. Resilience (Circuit Breakers)

`lib/circuitBreaker.ts` is a small, generic, per-dependency breaker: trips open after `failureThreshold` consecutive failures/timeouts, stays open for `cooldownMs`, then lets one probe call through (success closes it, failure re-opens for another cooldown). Two instances guard `lib/redis.ts`:

| Breaker | Timeout | Failure threshold | Cooldown | Behavior when open |
|---|---|---|---|---|
| Redis breaker | 150 ms | 3 | 10 s | Cache reads/writes are skipped entirely; app falls through to the database. A degraded cache never adds latency. |
| DB breaker | 4 s | 3 | 5 s | The fetcher passed to `cacheGetOrSet` throws `ServiceUnavailableError` immediately instead of hanging up to 4s per call — there's no fallback below the DB. |

Both log state transitions via `lib/logger.ts` and increment `journalink_circuit_breaker_trips_total`. Currently only `GET /api/feed` and `GET /api/search` catch `ServiceUnavailableError` and return `503 Retry-After: 5`; other routes let it surface as an unhandled `500` (still fast-failing, still logged) — the pattern is meant to be extended to more routes over time.

## 12. Realtime

Notifications are pushed over **Supabase Realtime** (Postgres changes streamed over WebSocket) — there is no custom socket server (the app has no long-lived process to host one).

1. Postgres triggers insert a `notifications` row when a user is liked, followed, commented on, mentioned, or has an application status change.
2. `components/notifications/useNotificationsRealtime.ts` subscribes to `INSERT`/`UPDATE` on `notifications`, filtered to `recipient_id = <current user>`.
3. The nav bell badge and the full notification list refetch the instant an event arrives.
4. A 60-second poll + on-window-focus refetch are a fallback if the socket connection drops.
5. Delivery is gated by the same RLS `SELECT` policy as normal reads, so a client only ever receives its own notifications — Realtime cannot leak another user's rows.

One-time Supabase-side setup (not code): add `notifications` to the `supabase_realtime` publication, and ensure an RLS `SELECT` policy exists for `recipient_id = auth.uid()`.

## 13. Background Jobs

The only scheduled job is the Kubernetes CronJob **`journalink-publish-scheduled`** (`k8s/cronjob.yaml`):

- **Schedule:** `*/2 * * * *` (every 2 minutes), `concurrencyPolicy: Forbid` (no overlapping runs)
- **Mechanism:** a `curlimages/curl` container `POST`s `Authorization: Bearer $(CRON_SECRET)` to the in-cluster service URL `http://journalink.journalink.svc.cluster.local/api/internal/publish-scheduled`
- **Purpose:** scheduled posts are already correctly hidden/shown by the `scheduled_at` filter on every read — no worker is needed for *correctness*. What's missing without this job is *promptness*: the feed/author cache wouldn't know a post just became visible until its TTL naturally expired (up to 5 minutes for an author's own page). The job tightens that window to within ~2–3 minutes by proactively busting the relevant cache entries the moment a post's schedule passes.
- Idempotent and safe to re-run; introduces no new DB state.

## 14. Observability

- **Logging** (`lib/logger.ts`) — one structured JSON line per call (`level`, `message`, ISO `time`, arbitrary metadata) to stdout/stderr, which `kubectl logs` / any container log driver already captures. No external log shipper.
- **Metrics** (`lib/metrics.ts`) — a hand-rolled, in-process Prometheus-style registry (no external dependency), exposed at `GET /api/metrics` (bearer-token gated, see [§6](#machine-to-machine-auth-non-user-bearer-tokens)):

  | Metric | Type | Labels |
  |---|---|---|
  | `journalink_cache_hits_total` | Counter | `prefix` (cache key's first segment, e.g. `feed`, `profile`) |
  | `journalink_cache_misses_total` | Counter | `prefix` |
  | `journalink_circuit_breaker_trips_total` | Counter | `breaker` (`redis` \| `db`) |
  | `journalink_rate_limit_blocked_total` | Counter | `scope` (rate-limit key prefix) |
  | `journalink_http_request_duration_ms` | Histogram | route/status (buckets: 10, 50, 100, 250, 500, 1000, 2500, 5000 ms) |

  Metrics are per-pod, in-process state — with the HPA running multiple replicas, Prometheus scraping and aggregating across pods is the expected model, not a limitation of this design.

## 15. Deployment Architecture

### Docker
Multi-stage `Dockerfile`: `deps` (clean `npm ci`) → `builder` (Next.js `output: "standalone"` build; `NEXT_PUBLIC_*` vars passed as build **args** since they're inlined into the client bundle) → `runner` (Node 20-alpine, non-root `nextjs` user, ships only the standalone server output, ~150 MB image).

### Docker Compose
`docker-compose.yml` runs the app + a `redis:7-alpine` container (AOF persistence, healthcheck-gated `depends_on`) for a local prod-like stack.

### Kubernetes (`k8s/`)
| Manifest | Purpose |
|---|---|
| `namespace.yaml` | `journalink` namespace |
| `configmap.yaml` | `NODE_ENV`, `PORT`, `REDIS_URL` (`redis://redis:6379`), `NEXT_PUBLIC_SUPABASE_URL` |
| `secret.yaml.example` | Template only — NOT applied by `kubectl apply -f k8s/`, so it can't clobber the real secret |
| `redis.yaml` | Headless Service + single-replica `StatefulSet` (Redis 7-alpine, AOF, 1Gi PVC, readiness via `redis-cli ping`) |
| `deployment.yaml` | App Deployment — **2 replicas**, readiness probe hits `/login` (a real HTTP check — traffic routes only once the app truly serves), liveness is a cheap TCP check, resource requests `100m CPU`/`256Mi`, limits `500m CPU`/`512Mi` |
| `service.yaml` | ClusterIP Service, port 80 → container port 3000 |
| `ingress.yaml` | nginx Ingress, TLS via cert-manager `ClusterIssuer` |
| `hpa.yaml` | HorizontalPodAutoscaler — 2 to 5 replicas, target 70% average CPU utilization |
| `cluster-issuer.yaml` | Self-signed `ClusterIssuer` by default (swap for a real Let's Encrypt issuer for a production domain) |
| `cronjob.yaml` | `journalink-publish-scheduled` (see [§13](#13-background-jobs)) |

Supabase, Resend, and Upstash (for Redis in the hosted-Redis case) remain external managed services — only Redis runs in-cluster here.

### CI/CD (`.github/workflows/ci.yml`)
Runs on every push/PR to `main`, three sequential jobs:
1. **`verify`** (always runs) — `npm ci` → `lint` → `typecheck` → `test` (Vitest) → `build`, with placeholder values for runtime-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `REDIS_URL=redis://localhost:6379`) since the build only needs those modules to import cleanly, not to actually connect.
2. **`docker`** (push-to-`main` only, needs `verify`) — builds and pushes to `ghcr.io/<owner>/<repo>` tagged `latest` and the commit SHA, using only the built-in `GITHUB_TOKEN`.
3. **`deploy`** (push-to-`main` only, needs `docker`) — applies `k8s/` and rolls the new image out via `kubectl set image` + `rollout status`. **Self-skips with a warning** (not a failure) if the `KUBE_CONFIG` secret isn't configured yet, so the pipeline stays green before a real cluster exists.

### Build-time vs. runtime environment split
`NEXT_PUBLIC_*` variables are inlined into the client bundle at **build** time (must be Docker build-args / CI env vars during `docker build`), while everything else (`SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `RESEND_API_KEY`, `CRON_SECRET`, `METRICS_TOKEN`) is injected only at **runtime** via the container environment / K8s ConfigMap+Secret.

## 16. Environment Variables Reference

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build + runtime | Supabase project URL — used by browser, server, and admin clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build | Supabase anon/public key — RLS-scoped, safe to expose client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime only | Privileged key for `lib/supabase/admin.ts`; bypasses RLS — never exposed to the client |
| `REDIS_URL` | Runtime only | `ioredis` connection string — caching, rate limiting, password-reset tokens |
| `RESEND_API_KEY` | Runtime only | Resend API key for transactional email |
| `NEXT_PUBLIC_SITE_URL` | Runtime | Base URL for building password-reset links when the request origin isn't reliable |
| `CRON_SECRET` | Runtime only | Shared bearer-token secret the K8s CronJob uses to call `/api/internal/publish-scheduled` |
| `METRICS_TOKEN` | Runtime only | Shared bearer-token secret gating `/api/metrics` from public exposure |
| `NODE_ENV` | Runtime | Standard; toggles dev-only console logging and dev-only global Redis-client caching |

There is no `.env.example` checked in; these are documented in `README.md` and enumerated here from the code that reads them.

## 17. Known Gaps / Conventions Worth Noting

These are deliberate current-state tradeoffs, not necessarily bugs — worth knowing before extending the API:

- **No API versioning scheme** — breaking a response shape today would break every current client with no migration path (no `/api/v1`, no version header).
- **No shared request-validation library** — every route hand-rolls its own checks; adding Zod (or similar) would remove a lot of repeated boilerplate and reduce the chance of a missed edge case in a new route.
- **No centralized API auth middleware** — the same `auth.getUser()` + 401 block is copy-pasted into all ~30 route files. A `withAuth()` helper would reduce duplication, though it would need to preserve the per-route access to both `supabase` and `user`.
- **Schema lives only in the Supabase dashboard** — no in-repo migrations, so schema history/diffs aren't version-controlled alongside the code that depends on them.
- **The 503-on-circuit-breaker-open pattern is only wired into 2 routes** (`feed`, `search`) even though every cached route shares the same `ServiceUnavailableError` risk; other routes will surface a generic `500` instead when the DB breaker is open.
- **`app/api/notifications/[id]` (`PATCH`) has no ownership check in the route itself** — it relies entirely on RLS to prevent marking someone else's notification read.
