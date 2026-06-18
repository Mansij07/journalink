# Journalink

A social and research platform built for BITS Pilani — connecting students, researchers, and projects across campus.

---

## Overview

Journalink is a university-focused platform that bridges the gap between academic research and student collaboration. Students can discover ongoing research projects, apply to join them, share updates through posts, and build a verified academic profile — all within a single platform tailored to the BITS ecosystem.

---

## Features

- **Authentication** — Secure login via GitHub and Google OAuth with onboarding flow for new users
- **Profiles** — Verified student profiles with branch, year, skills, and bio
- **Projects** — Post and discover research projects; apply with a single click
- **Applications** — End-to-end application management for project owners and applicants
- **Feed** — Campus-wide post feed for announcements, updates, and discussions
- **Notifications** — Real-time notifications for applications, approvals, and activity
- **File Storage** — Supabase-backed storage for avatars and project assets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with OAuth providers configured (GitHub, Google)

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
├── app/                  # Next.js App Router pages and layouts
│   ├── auth/             # Auth callback and OAuth handling
│   ├── feed/             # Main feed
│   ├── onboarding/       # New user onboarding flow
│   └── projects/         # Project discovery and detail pages
├── components/           # Reusable UI components
├── lib/                  # Supabase client utilities
└── types/                # TypeScript types and interfaces
```

---

## Database Schema

Core tables managed via Supabase:

- `profiles` — User profile data linked to Supabase Auth
- `projects` — Research and student projects
- `applications` — Student applications to projects
- `posts` — Feed posts and announcements
- `notifications` — In-app notification records

---
