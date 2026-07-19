# API Routes Guide (Beginner-Friendly)

A plain-language companion to `docs/API_DESIGN.md`. That document is written for an experienced engineer; this one explains every route file in `app/api/` the way you'd explain it to someone new to programming — what it does, what helper functions it leans on, and anything clever or easy to trip over.

## Quick glossary (read this once, refer back as needed)

- **Cache** — a temporary saved copy of data, kept somewhere fast (here, a tool called Redis) so the app doesn't have to ask the real database the same question over and over. A cache entry has a **TTL** ("time to live") — after that many seconds/minutes, it's treated as stale and refetched.
- **Invalidate / bust a cache** — deliberately throw away a cached copy because the real data just changed, so the next read gets fresh data instead of stale data.
- **RLS (Row Level Security)** — a set of rules living inside the database itself (Postgres) that decide who's allowed to read/write which rows, enforced automatically no matter what code asks. Most routes rely on RLS as a safety net *in addition to* their own checks.
- **RPC** — short for "remote procedure call." Instead of the API code doing an update itself, it asks the database to run a named function that lives inside the database. Useful when several things need to happen together safely (e.g. "accept this application AND use up a project slot" as one atomic step).
- **Service-role / admin client** — a special, highly privileged way of talking to the database that skips RLS entirely. Dangerous by design — only used in a handful of places where there's no logged-in user to check permissions against.
- **Rate limit** — a "don't let one person do this too fast" rule (e.g. "at most 10 posts every 5 minutes"), enforced by counting attempts in Redis.
- **Circuit breaker** — a safety mechanism that stops the app from repeatedly hammering something (like Redis or the database) that's clearly broken, so one slow/dead dependency can't drag the whole app down.
- **`?.` and `??`** — `?.` ("optional chaining") means "only read this property if the thing before it isn't empty, otherwise just get nothing instead of crashing." `??` ("nullish coalescing") means "use this value, but if it's empty, use this fallback instead."

Every route in this app follows roughly the same shape: **check the user is logged in → read/validate the input → read or write the database → clear any cache that's now stale → send back a JSON response.** The entries below call out only what's different or noteworthy about each one.

---

## 1. Follows

### `app/api/follows/route.ts`
**What it does**: Follow or unfollow another user.
**Methods**: POST — follow someone. DELETE — unfollow someone.
**Helper functions it uses**: `invalidateFollow()` (from `lib/social.ts`) — clears the cached follower/following counts and a few other cached lists for both people involved.
**Unique tricks**: Nothing unusual — standard pattern. Both actions are scoped to `follower_id = you`, so RLS naturally allows them (you're always deleting/creating your own row).

### `app/api/follows/list/route.ts`
**What it does**: Gets the list of people who follow someone, or the list of people someone follows — powers the "Followers / Following" popup.
**Methods**: GET only — takes `?userId=` and `?type=followers|following` in the URL.
**Helper functions it uses**: `getFollowersProfiles()` / `getFollowingProfiles()` (from `lib/social.ts`) — each does two database lookups (first get the relevant ids, then fetch those profiles) and is deliberately **not cached**, so the list always reflects the latest follow/unfollow.
**Unique tricks**: Any logged-in user can view *anyone's* followers/following list, not just their own — this is intentional (it's public info, same as the visible follow counts on a profile).

### `app/api/follows/remove-follower/route.ts`
**What it does**: Lets you forcibly remove someone who follows you — a "remove this follower" button.
**Methods**: POST only.
**Helper functions it uses**: `createAdminClient()` (the privileged, RLS-skipping connection) and `invalidateFollow()`.
**Unique tricks**: Normally RLS only lets you delete a row *you* created. But removing a follower means deleting *their* row (they created the follow, not you) — so this route switches to the admin connection to get around that. To stay safe despite skipping RLS, it manually rewrites the same protection directly into the database query (`.eq("following_id", user.id)`), so even with the safety net off, the query can still only ever delete a row where *you* are the one being followed — never anyone else's data.

---

## 2. Posts

### `app/api/posts/route.ts`
**What it does**: Fetch a page of a specific author's posts, or create a new post.
**Methods**: GET — one page of one author's posts (`?author=`, `?page=`). POST — create a post.
**Helper functions it uses**: `getAuthorPostsPage()` (cached list of an author's posts), `invalidateFeedAndAuthor()` (clears the shared feed cache and this author's post-list cache), `rateLimit()` (blocks someone from posting more than 10 times in 5 minutes).
**Unique tricks**: Only the post's own author gets to see their *future-scheduled* posts when viewing their own page — everyone else has scheduled-but-not-yet-live posts hidden, done via a simple id comparison (`author === user.id`), not a separate permission check. Optional scheduling: if you set a future date, the post is saved immediately but stays invisible in feeds until that time passes.

### `app/api/posts/[id]/route.ts`
**What it does**: Fetch one specific post (with its author attached), or delete your own post.
**Methods**: GET — one post + its author's profile. DELETE — remove a post you wrote.
**Helper functions it uses**: `getPostById()` (cached single-post lookup), `getProfileById()` (cached profile lookup), `invalidateFeedAndAuthor()`.
**Unique tricks**: A future-scheduled post that isn't yours yet returns "Not found" (404), not "Forbidden" (403) — this hides the fact that it exists at all rather than just blocking access to it. The DELETE query bakes the ownership check directly into the database query (`.eq("author_id", user.id)`) instead of checking separately first, so it's simply impossible to construct a query that deletes someone else's post.

### `app/api/posts/[id]/likes/route.ts`
**What it does**: Like/unlike a post, and see how many likes it has.
**Methods**: GET — like count + whether you've liked it. POST — like it. DELETE — remove your like.
**Helper functions it uses**: None from shared library files — talks to the `post_likes` table directly.
**Unique tricks**: Not cached at all (likes change too often for caching to be worth it). Runs the "how many likes" and "did I like it" database checks *at the same time* (in parallel) rather than one after another, to keep the response fast.

### `app/api/posts/[id]/reposts/route.ts`
**What it does**: Repost (like a retweet) a post, or undo a repost.
**Methods**: GET — repost count + whether you reposted it. POST — repost it. DELETE — remove your repost.
**Helper functions it uses**: None — direct database calls to the `post_reposts` table.
**Unique tricks**: Identical structure to likes, just a different table. Nothing in this file itself stops you from reposting the same post twice by calling POST repeatedly — that protection (if it exists) would have to come from a rule set up in the database, not this code.

### `app/api/posts/[id]/bookmarks/route.ts`
**What it does**: Save (bookmark) a post for later, or remove the bookmark.
**Methods**: GET — whether you've bookmarked it (true/false). POST — bookmark it. DELETE — remove the bookmark.
**Helper functions it uses**: None — direct database calls to the `post_bookmarks` table.
**Unique tricks**: Simpler than likes/reposts — there's no public *count* returned, only whether *you* bookmarked it, since bookmarks are private (nobody else needs to see how many people bookmarked a post).

### `app/api/posts/[id]/comments/route.ts`
**What it does**: List the comments on a post (or just get a reply count for a badge), and add a new comment.
**Methods**: GET — all comments, oldest first (or `?countOnly=1` for just a number). POST — add a comment.
**Helper functions it uses**: None from shared files — queries `comments` and `profiles` directly.
**Unique tricks**: To avoid asking the database "who wrote this?" once per comment (slow if there are many comments), it first collects every unique author id from all the comments, fetches all of those profiles in *one* database call, and then matches each comment back up to its author using a fast in-memory lookup table (a `Map`). This "batch fetch, then stitch together" trick shows up in several files in this app.

---

## 3. Comment reactions

### `app/api/comments/[id]/reactions/route.ts`
**What it does**: Like or dislike a *comment* (as opposed to a post).
**Methods**: GET — like/dislike counts + your own reaction. POST — set your reaction (`"like"` or `"dislike"`). DELETE — remove your reaction.
**Helper functions it uses**: None from shared files — direct queries to `comment_reactions`.
**Unique tricks**: The URL is `/api/comments/{id}/reactions`, not nested under `/api/posts/{postId}/comments/{id}/reactions` — because a comment's own id is all that's needed to react to it, no need to also know which post it belongs to. Setting a reaction uses an "upsert" (update-or-insert) rather than a plain insert, so switching from "like" to "dislike" just overwrites your existing reaction instead of erroring out for trying to react twice.

---

## 4. Notifications

### `app/api/notifications/route.ts`
**What it does**: List your notifications, or mark all of them as read at once.
**Methods**: GET — your notifications, most recent first (supports `?limit=`/`?offset=` paging). PATCH — mark *every* unread notification as read.
**Helper functions it uses**: None from shared files.
**Unique tricks**: Uses a database feature called an "embedded relation" (`actor:profiles!actor_id (...)`) to fetch each notification *together with* the profile of whoever caused it, in one single database query — instead of the "fetch ids, then fetch profiles separately" trick used elsewhere in this app. The `!actor_id` part exists because a notification actually has *two* different links to a profile (who caused it, and who receives it), so it has to specify which one to follow.

### `app/api/notifications/[id]/route.ts`
**What it does**: Mark one specific notification as read.
**Methods**: PATCH only.
**Helper functions it uses**: None.
**Unique tricks (worth flagging)**: This one is missing a check that the other notification routes have — it doesn't verify the notification actually belongs to you before marking it read (no `recipient_id = you` filter). In practice this means any logged-in user who knows or guesses a notification's id could mark it as read, even if it isn't theirs. Not dangerous data-wise, but a real gap compared to the rest of the codebase's pattern.

### `app/api/notifications/unread-count/route.ts`
**What it does**: Returns just a number — how many unread notifications you have (powers the little badge on a bell icon).
**Methods**: GET only.
**Helper functions it uses**: None — a single, efficient "count only" database query.
**Unique tricks**: Nothing unusual — about as simple as an endpoint gets.

---

## 5. Profile

### `app/api/profile/route.ts`
**What it does**: Get your own profile, or update it (name, bio, username, etc.).
**Methods**: GET — your profile. PATCH — update one or more fields.
**Helper functions it uses**: `getProfileById()` (cached profile lookup), `invalidateProfile()` (clears the cached copy after an edit).
**Unique tricks**: Uses a **whitelist** of exactly which fields are allowed to be changed (`ALLOWED_FIELDS`) — anything in the request body that isn't on that list is silently ignored rather than saved. This is a safety pattern: even if someone sneaks extra fields into the request, only pre-approved ones ever reach the database. Usernames get extra validation (letters/numbers/underscores only, 3–30 characters) since they're used directly in page URLs (`/profiles/yourname`). The doc comment explains this whole route exists specifically because editing a profile used to skip the server entirely (browser talked straight to the database), which meant the cache never got cleared after an edit — this route was added just to fix that.

---

## 6. Search & discovery

### `app/api/search/route.ts`
**What it does**: Type-ahead search for people by username or name.
**Methods**: GET only — `?q=` is the search text.
**Helper functions it uses**: `cacheGetOrSet()` (the general caching helper), `rateLimit()` (max 30 searches/minute per user).
**Unique tricks (worth flagging)**: Builds part of its database query by directly inserting your typed search text into a filter string (`username.ilike.%${q}%`). This isn't full SQL injection, but special characters in what you type (like a comma) could still confuse the database's own mini filter language and change what the search actually matches — a rough edge worth being aware of, not a proven exploit.

### `app/api/mentions/route.ts`
**What it does**: Gets the list of people you can "@mention" in a post (specifically: people you follow), for the autocomplete dropdown.
**Methods**: GET only.
**Helper functions it uses**: `getMentionCandidates()` (from `lib/social.ts`) — cached for 10 minutes, automatically cleared whenever your follow list changes.
**Unique tricks**: The actual "narrow down as you type" filtering happens in the browser, not here — this endpoint just hands over your whole following list once. You can only @mention people you follow, not anyone on the platform.

### `app/api/recent-searches/route.ts`
**What it does**: Remembers which profiles you recently viewed/searched, for a "recently viewed" dropdown.
**Methods**: GET — your recent list. POST — record that you just viewed someone. DELETE — clear your whole history.
**Helper functions it uses**: `getRecentSearches()`, `recordRecentSearch()`, `clearRecentSearches()` (all from `lib/social.ts`) — cached for 10 minutes, cleared automatically on every write so you always see your latest activity.
**Unique tricks**: Quietly does nothing if you "view" your own profile (no point recording that). If saving to the database fails, it doesn't fail the whole request — it just logs a warning (outside of production) and moves on, since "recently viewed" is a nice-to-have, not critical data.

---

## 7. Projects

### `app/api/projects/route.ts`
**What it does**: Create a new project listing (professors only, by convention — enforced elsewhere).
**Methods**: POST only.
**Helper functions it uses**: `invalidateProjects()` (clears cached project lists), `shouldAutoClose()` (checks if the deadline's already passed or slots are already full).
**Unique tricks**: Same whitelist-of-allowed-fields trick as the profile route. If you create a project with a deadline already in the past (or zero slots), it's automatically saved as already "Closed" instead of briefly appearing open.

### `app/api/projects/[id]/route.ts`
**What it does**: Edit or delete your own project listing.
**Methods**: PATCH — update fields. DELETE — remove the project.
**Helper functions it uses**: `invalidateProjects()`, `shouldAutoClose()`.
**Unique tricks**: If you edit the deadline or slot count, it automatically re-checks whether the project should now be marked "Closed" — a small bit of self-maintaining logic. Like the post-delete route, ownership is baked directly into the query (`.eq("professor_id", user.id)`) rather than checked separately, so touching someone else's project just silently affects zero rows (reported back as a 404).

### `app/api/projects/[id]/viewer-state/route.ts`
**What it does**: Tells the frontend what *you specifically* should see on a project's page — are you the owner, have you already applied, have you hit your application limit?
**Methods**: GET only.
**Helper functions it uses**: `getProjectById()`, `getProfileById()`, `isProfileComplete()` (do you have a name/branch/year filled in — required to apply), `acceptCapForYear()` (how many confirmed projects your year is allowed).
**Unique tricks**: This route exists specifically so the *main* project page can stay one shared, cacheable page for everyone, while this small separate endpoint handles the "personalized" bits. It runs four lookups at once for speed, but skips the "how many people applied" count entirely (replacing it with a fake instant `0`) unless you're the project's owner — so non-owners never learn the applicant count through this endpoint.

---

## 8. Applications

### `app/api/applications/route.ts`
**What it does**: Lets a student apply to a project.
**Methods**: POST only.
**Helper functions it uses**: `getProfileById()`, `acceptCapForYear()`, `invalidateApplications()`.
**Unique tricks**: Only accepts a resume link if it points into this app's own file storage (rejects arbitrary external links). Checks three things at once (your profile, how many projects you're already confirmed into, and the target project) for speed. If you've already applied, the database itself rejects the duplicate (a "unique constraint" error, code `23505`) — the code specifically catches that exact error code and turns it into a friendly "You already applied" message instead of a raw database error.

### `app/api/applications/[id]/route.ts`
**What it does**: Lets a professor accept/reject an application, or lets a student withdraw their own still-pending one.
**Methods**: PATCH — change status (professor). DELETE — withdraw (student, only while still "pending").
**Helper functions it uses**: `invalidateApplications()`.
**Unique tricks**: Doesn't manually check "are you allowed to do this" in code at all — relies entirely on RLS to silently block it. If nothing came back after the update, it just says "Not permitted or not found" — a permission failure and a genuinely missing application look identical to the caller, which is a deliberate way of not leaking which reason applied.

### `app/api/applications/[id]/confirm/route.ts`
**What it does**: A student accepts an offer — confirming they're taking the spot.
**Methods**: POST only.
**Helper functions it uses**: `invalidateProjects()`, `invalidateApplications()`.
**Unique tricks**: Doesn't update the database directly at all — calls a database function (`confirm_application`) instead. That function checks you're really allowed to confirm, enforces the "how many projects can this year-level student be confirmed into" rule, and occupies a project slot, all as one safe, all-or-nothing step inside the database itself. After it succeeds, the route does a separate lookup just to figure out *which* project/professor were affected, purely so it knows which caches to clear.

### `app/api/applications/[id]/decline/route.ts`
**What it does**: A student turns down an offer they were already accepted for.
**Methods**: POST only.
**Helper functions it uses**: `invalidateApplications()`.
**Unique tricks**: Same "call a database function" pattern as confirm (`decline_application`), which checks you're the real applicant before making the change. No project-cache-clearing here — declining never occupied a project slot in the first place, so there's nothing project-related to refresh.

### `app/api/applications/[id]/leave/route.ts`
**What it does**: A student requests to leave a project they've joined; the professor approves or denies that request.
**Methods**: POST — student requests to leave. PATCH — professor approves/denies.
**Helper functions it uses**: `invalidateApplications()`, `invalidateProjects()`.
**Unique tricks**: Both actions go through database functions (`request_leave`, `resolve_leave_request`) that check the right person is making the request. Project caches are only cleared when the professor *approves* the leave — denying changes nothing about slot counts, so there's nothing to refresh in that case.

---

## 9. Auth (password reset)

### `app/api/auth/forgot-password/route.ts`
**What it does**: Sends a password-reset email.
**Methods**: POST only — no login required (you're logged out at this point).
**Helper functions it uses**: `rateLimit()` (max 5 requests per 15 minutes, keyed by the *target email*, not who's asking — stops someone from spamming one person's inbox).
**Unique tricks**: Always replies with the exact same generic message ("If an account exists, a reset link is on its way") no matter what actually happened — wrong email, rate-limited, real account, doesn't matter. This is intentional: it stops an attacker from using this endpoint to figure out which emails have accounts. The actual reset link uses a random one-time code stored directly in the cache system (Redis) for 1 hour, not in the main database.

### `app/api/auth/reset-password/route.ts`
**What it does**: Actually changes your password, using the one-time code from the email link.
**Methods**: POST only — no login required (the reset code itself proves who you are).
**Helper functions it uses**: None from shared files — reads/deletes the reset code directly from Redis.
**Unique tricks**: The reset code is deleted immediately after use, so the same email link can't be used twice.

---

## 10. Feed

### `app/api/feed/route.ts`
**What it does**: The main, shared, non-personalized global feed of posts.
**Methods**: GET only — `?page=` for pagination.
**Helper functions it uses**: `getFeedPage()` (cached, shared across everyone — the feed isn't personalized per-user), catches `ServiceUnavailableError` to return a clean "temporarily unavailable" response if the database is having serious trouble, instead of a confusing crash.
**Unique tricks**: Nothing unusual beyond what's already explained in the caching guide — this is the endpoint most exposed to the caching system's short 45-second TTL, since it's the highest-traffic read in the app.

---

## 11. Infrastructure / machine-only (no human user)

### `app/api/uploads/route.ts`
**What it does**: Handles file uploads (avatars, post images, resumes) — the browser sends the file here, and this route hands it to Supabase's file storage and returns a public link.
**Methods**: POST only.
**Helper functions it uses**: `rateLimit()` (max 20 uploads per 5 minutes).
**Unique tricks**: Builds the file's storage path itself, always starting with your own user id — because the storage system's own security rule only lets you write into a folder matching your id, which stops one user from overwriting someone else's files. There's **no file size or file type check anywhere in this code** — worth knowing, since a beginner might assume there's a guard here; any limit comes from Supabase Storage's own settings, not this route. Avatars/post images can overwrite an existing file at the same path; resumes can't (their filenames already include a timestamp so they're always unique, and the storage rule for that bucket only allows creating new files, not replacing old ones).

### `app/api/internal/publish-scheduled/route.ts`
**What it does**: A robot-only endpoint — an automated timer (a Kubernetes "CronJob") calls it every 2 minutes to nudge the app into showing newly-scheduled posts sooner, instead of waiting for the cache to naturally expire.
**Methods**: POST only.
**Helper functions it uses**: `createAdminClient()` (no logged-in user exists here at all, so it has to use the privileged connection), `invalidateFeedAndAuthor()`.
**Unique tricks**: Doesn't check for a logged-in user — instead it checks a secret password sent in a request header, compared with a plain equality check (not the more attack-resistant "constant time" comparison some very security-sensitive code uses). It deliberately looks back 3 minutes even though it only runs every 2, so a late or skipped run can never cause a post to be missed entirely. Despite the name, it doesn't actually "publish" anything itself — posts already correctly show/hide based on their scheduled time everywhere they're read; this route only makes the *cached* pages catch up faster.

### `app/api/metrics/route.ts`
**What it does**: Exposes internal performance numbers (cache hits/misses, request timings, rate-limit blocks) in a special text format a monitoring tool (Prometheus) can read and graph.
**Methods**: GET only.
**Helper functions it uses**: `renderMetrics()` (from `lib/metrics.ts`) — collects every tracked number and formats it.
**Unique tricks**: Gated by the same "secret password in a header" pattern as the cron route, using a different secret (`METRICS_TOKEN`) — needed because the app's network setup would otherwise let anyone on the internet hit this endpoint, not just the internal monitoring system. The numbers only live in server memory (not saved anywhere) and reset whenever the server restarts — if the app runs as multiple copies, each copy has its own separate numbers, and the monitoring tool is expected to add them all together itself.

---

## Patterns you'll see repeated everywhere

- **Auth check first, always**: nearly every route's first real step is "get the logged-in user; if there isn't one, stop and say Unauthorized."
- **Ownership baked into the query, not checked separately**: instead of "look up the row, then check if it's yours, then act," most delete/update routes just add `.eq("owner_column", user.id)` directly to the database query — so it's structurally impossible to affect someone else's data, rather than relying on remembering to check.
- **Batch-fetch-then-stitch-together**: whenever a list of things (posts, comments) needs each item's author attached, the code collects the unique author ids first, fetches all of them in one query, then matches them back up using a `Map` — avoiding one database call per item.
- **Cache, then bust on write**: reads that don't change often go through `cacheGetOrSet`; anything that writes calls a matching `invalidate...()` function afterward so the next read isn't stale.
- **Database functions (RPCs) for anything that must happen safely as one step**: application status changes (confirm/decline/leave) are done via named database functions rather than plain updates, so multi-part changes (like "accept AND use up a slot") can't half-happen.
