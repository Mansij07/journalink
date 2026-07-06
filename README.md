# Journalink

A social and research platform built for BITS Pilani — connecting students, researchers, and projects across campus.

---

## Overview

Journalink is a university-focused platform that bridges academic research and student collaboration. Professors post research projects, students discover and apply to them, and everyone shares updates through a Twitter-style feed — all within a single platform tailored to the BITS ecosystem.

---

## Features

- **Authentication** — Email/password and GitHub/Google OAuth via Supabase Auth, with a lightweight onboarding step (username + role) gated by middleware
- **Password reset** — Custom forgot/reset-password flow using single-use tokens stored in Redis and delivered via Resend
- **Profiles** — Full name, bio, branch, year, skills, and avatar (Supabase Storage), editable from Settings; role-based Student/Professor badge; follower/following counts
- **Projects** — Professors create and manage research projects (title, type, description, requirements, skills, slots, deadline); students browse open projects and apply; projects auto-close when the deadline passes or slots fill up
- **Applications** — End-to-end pipeline: apply → professor accepts/rejects → student confirms or declines the offer, with a year-based cap on how many projects a student can confirm
- **Feed & Posts** — Composer with @mentions, image/video/document attachments, and post scheduling; likes, comments (with like/dislike), reposts, and bookmarks; infinite-scroll pagination; a global search bar covering both profiles and projects
- **Notifications** — In-app notifications for likes, follows, comments, mentions, and application events, refreshed via polling (every 30s + on window focus)
- **Caching** — Redis (ioredis) cache-aside layer in front of profiles, projects, feed pages, and search, with explicit invalidation on writes
- **File Storage** — Supabase Storage for avatars and post media, with server-derived, per-user upload paths

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

## Notes

- Notifications are polling-based, not push/realtime.
- The Resend sender currently uses Resend's shared sandbox domain, which only delivers to the account owner — a verified custom domain is needed before password-reset emails reach real users.
