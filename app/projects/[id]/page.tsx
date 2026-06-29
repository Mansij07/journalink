import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Users } from "lucide-react"

import type { ApplicationStatus } from "@/lib/types"
import { getProfileById, isProfileComplete } from "@/lib/profile"
import { getProjectById } from "@/lib/projects"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ProjectDetailActions } from "@/components/projects/ProjectDetailActions"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const project = await getProjectById(supabase, id)

  if (!project) notFound()

  const typed = project
  const isOwner = typed.professor_id === user.id

  // Student: have they already applied? Owner: how many applications?
  // Also load the viewer's profile to gate the Apply action.
  const [{ data: myApplication }, { count: applicationCount }, viewer] =
    await Promise.all([
      supabase
        .from("applications")
        .select("id, status")
        .eq("project_id", typed.id)
        .eq("applicant_id", user.id)
        .maybeSingle(),
      isOwner
        ? supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("project_id", typed.id)
        : Promise.resolve({ count: 0 }),
      getProfileById(supabase, user.id),
    ])

  const isStudent = (viewer?.role ?? "Student") !== "Prof"
  const profileComplete = isProfileComplete(viewer ?? null)

  const prof = typed.profiles
  const profName = prof?.full_name || prof?.username || "Unknown"
  const isOpen = typed.status === "Open"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[820px] px-6 py-10">
        <Link
          href="/projects"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <div className="flex flex-wrap items-center gap-1.5">
          {typed.type && (
            <Badge variant="outline" className="font-normal">
              {typed.type}
            </Badge>
          )}
          <Badge variant={isOpen ? "default" : "secondary"} className="font-normal">
            {typed.status}
          </Badge>
        </div>

        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] text-foreground">
          {typed.title}
        </h1>

        {/* Professor */}
        <Link
          href={prof?.username ? `/profiles/${prof.username}` : "#"}
          className="mt-4 inline-flex items-center gap-2"
        >
          <Avatar size="sm">
            {prof?.avatar_url && <AvatarImage src={prof.avatar_url} alt="" />}
            <AvatarFallback>{profName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {profName}
            {prof?.username && <span className="text-muted-foreground/70"> · @{prof.username}</span>}
          </span>
        </Link>

        {/* Meta */}
        {(typed.slots != null || typed.deadline) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {typed.slots != null && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" />
                {typed.slots} open {typed.slots === 1 ? "slot" : "slots"}
              </span>
            )}
            {typed.deadline && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Apply by {new Date(typed.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        )}

        <div className="mt-6">
          <ProjectDetailActions
            project={typed}
            userId={user.id}
            isOwner={isOwner}
            isStudent={isStudent}
            profileComplete={profileComplete}
            applied={!!myApplication}
            applicationStatus={(myApplication?.status as ApplicationStatus) ?? null}
            applicationCount={applicationCount ?? 0}
          />
        </div>

        <Separator className="my-8" />

        {typed.description && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-semibold tracking-[-0.01em] text-foreground">
              About this project
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {typed.description}
            </p>
          </section>
        )}

        {typed.requirements && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-semibold tracking-[-0.01em] text-foreground">
              Requirements
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {typed.requirements}
            </p>
          </section>
        )}

        {typed.skills && typed.skills.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-semibold tracking-[-0.01em] text-foreground">
              Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {typed.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
