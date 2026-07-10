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

### Personalization

- **Settings** — Manage profile, appearance, and account from one place
- **Themes** — Light / dark mode support

### Under the Hood

- **Caching** — Redis (ioredis) cache-aside layer in front of profiles, projects, feed pages, and search, with explicit invalidation on writes
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
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with OAuth providers configured (GitHub, Google)
- A Redis instance (for caching and password-reset tokens)
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
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

## Notes

- The Resend sender currently uses Resend's shared sandbox domain, which only delivers to the account owner — a verified custom domain is needed before password-reset emails reach real users.
