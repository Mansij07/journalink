import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { BadgeCheck, GraduationCap, Pencil, Briefcase } from "lucide-react"

import { acceptCapForYear, getProfileByUsername } from "@/lib/profile"
import { getFollowCounts } from "@/lib/social"
import { getOwnerProjects } from "@/lib/projects"
import { getAuthorPosts } from "@/lib/posts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PostCard } from "@/components/feed/PostCard"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { FollowButton } from "@/components/profiles/FollowButton"
import { StaggerContainer } from "@/components/StaggerContainer"

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
    postList,
    projectList,
    { count: confirmedCount },
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
    getAuthorPosts(supabase, profile.id),
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
  ])

  // Scheduled-for-the-future posts are only shown on the owner's own profile.
  const now = Date.now()
  const visiblePosts = isMe
    ? postList
    : postList.filter((post) => {
        const s = (post as { scheduled_at?: string | null }).scheduled_at
        return !s || Date.parse(s) <= now
      })

  const displayName = profile.full_name || profile.username || "Unknown"
  const initials = displayName.slice(0, 2).toUpperCase()
  const acceptCap = acceptCapForYear(profile.year)

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[680px] px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Avatar size="lg" className="size-20">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
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
              currentUserId={user.id}
              initialFollowing={!!followRow}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground">
            {displayName}
          </h1>
          {isProf && <BadgeCheck className="size-5 text-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={isProf ? "default" : "secondary"} className="font-normal">
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
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {profile.bio}
          </p>
        )}

        {Array.isArray(profile.skills) && profile.skills.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
          <span className="text-foreground">
            <span className="font-semibold">{following ?? 0}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span className="text-foreground">
            <span className="font-semibold">{followers ?? 0}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
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

        <Separator className="my-8" />

        {/* Professor's open projects */}
        {isProf && projectList.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold tracking-[-0.01em] text-foreground">
              Open Projects
            </h2>
            <StaggerContainer
              revealKey={projectList.length}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {projectList.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </StaggerContainer>
          </section>
        )}

        {/* Posts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-[-0.01em] text-foreground">
            Posts
          </h2>
          {visiblePosts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No posts yet.
            </p>
          ) : (
            <StaggerContainer revealKey={visiblePosts.length}>
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} userId={user.id} />
              ))}
            </StaggerContainer>
          )}
        </section>
      </div>
    </div>
  )
}
