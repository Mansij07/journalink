import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { BadgeCheck, GraduationCap, Pencil, Briefcase } from "lucide-react"

import { acceptCapForYear, getProfileByUsername } from "@/lib/profile"
import { getFollowCounts } from "@/lib/social"
import { getOwnerProjects } from "@/lib/projects"
import { getStudentApplications } from "@/lib/applications"
import { getAuthorPostsPage } from "@/lib/posts"
import type { StudentApplication } from "@/components/applications/ApplicationsView"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FollowButton } from "@/components/profiles/FollowButton"
import { ProfileProjects } from "@/components/profiles/ProfileProjects"
import { ProfileApplications } from "@/components/profiles/ProfileApplications"
import { ProfilePosts } from "@/components/profiles/ProfilePosts"
import { FollowListDialog } from "@/components/profiles/FollowListDialog"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfileByUsername(supabase, username)

  if (!profile) notFound()

  const isMe = profile.id === user.id
  const isProf = profile.role === "Prof"

  const [
    { followers, following },
    { data: followRow },
    { posts: initialPosts, hasMore: postsHaveMore },
    projectList,
    { count: confirmedCount },
    studentApplications,
  ] = await Promise.all([
    getFollowCounts(supabase, profile.id),
    isMe
      ? Promise.resolve({ data: null })
      : supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle(),
    // First page only — the rest load on scroll via ProfilePosts. Owner sees
    // their own future-scheduled posts (includeScheduled = isMe).
    isProf
      ? getAuthorPostsPage(supabase, profile.id, 0, isMe)
      : Promise.resolve({ posts: [], hasMore: false }),
    isProf
      ? getOwnerProjects(supabase, profile.id, true)
      : Promise.resolve([]),
    // Own student profile: how many projects they've accepted (for the cap line).
    isMe && !isProf
      ? supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("applicant_id", profile.id)
          .eq("status", "confirmed")
      : Promise.resolve({ count: 0 }),
    // Own student profile: the full list of the student's applications.
    isMe && !isProf
      ? getStudentApplications(supabase, profile.id)
      : Promise.resolve([] as StudentApplication[]),
  ])

  const displayName = profile.full_name || profile.username || "Unknown"
  const initials = displayName.slice(0, 2).toUpperCase()
  const acceptCap = acceptCapForYear(profile.year)

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Avatar size="xl" className="size-20">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="text-4xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <h1 className="text-4xl font-semibold tracking-[-0.025em] text-foreground">
            {displayName}
          </h1>
          {isProf && <BadgeCheck className="size-5 text-foreground" />}
          <div className="ml-1.5">
            {isMe ? (
              <Button variant="outline" asChild>
                <Link href="/settings">
                  <Pencil data-icon="inline-start" />
                  Edit Profile
                </Link>
              </Button>
            ) : (
              <FollowButton
                targetId={profile.id}
                initialFollowing={!!followRow}
              />
            )}
          </div>
        </div>
        <p className="text-md text-muted-foreground">@{profile.username}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={isProf ? "default" : "secondary"} className="font-normal h-7 px-3 text-md">
            {isProf ? "Professor" : "Student"}
          </Badge>
          {isProf
            ? profile.branch && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase className="size-4" />
                  {profile.branch}
                </span>
              )
            : (profile.branch || profile.year != null) && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <GraduationCap className="size-4" />
                  {[profile.branch, profile.year ? `Year ${profile.year}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
        </div>

        {profile.bio && (
          <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-foreground">
            {profile.bio}
          </p>
        )}

        {Array.isArray(profile.skills) && profile.skills.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isProf ? "Research interests" : "Skills"}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill: string) => (
                <Badge key={skill} variant="secondary" className="font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-5 text-lg">
          <FollowListDialog
            userId={profile.id}
            type="following"
            count={following ?? 0}
            label="Following"
            isOwn={isMe}
          />
          <FollowListDialog
            userId={profile.id}
            type="followers"
            count={followers ?? 0}
            label="Followers"
            isOwn={isMe}
          />
          {isProf && (
            <span className="text-foreground">
              <span className="font-semibold">{projectList.length}</span>{" "}
              <span className="text-muted-foreground">
                Open project{projectList.length === 1 ? "" : "s"}
              </span>
            </span>
          )}
          {isMe && !isProf && (
            <span className="text-foreground">
              <span className="font-semibold">
                {confirmedCount ?? 0}/{acceptCap}
              </span>{" "}
              <span className="text-muted-foreground">Accepted</span>
            </span>
          )}
        </div>

        {/* Student's own applications (private — owner only) */}
        {isMe && !isProf && studentApplications.length > 0 && (
          <>
            <Separator className="my-8" />
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em] text-foreground">
                My Applications
              </h2>
              <ProfileApplications applications={studentApplications} />
            </section>
          </>
        )}

        {isProf && <Separator className="my-8" />}

        {/* Professor's open projects */}
        {isProf && projectList.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em] text-foreground">
              Open Projects
            </h2>
            <ProfileProjects projects={projectList} />
          </section>
        )}

        {/* Posts — only professors can create posts, so students have none.
            Loaded a page at a time on scroll to keep DB load light. */}
        {isProf && (
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em] text-foreground">
              Posts
            </h2>
            <ProfilePosts
              authorId={profile.id}
              viewerId={user.id}
              initialPosts={initialPosts}
              initialHasMore={postsHaveMore}
            />
          </section>
        )}
      </div>
    </div>
  )
}
