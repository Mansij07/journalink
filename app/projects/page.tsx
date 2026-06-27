import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Briefcase, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "Student"
  const isProf = role === "Prof"

  const { data: projects } = await supabase
    .from("project")
    .select("id")
    .eq(isProf ? "professor_id" : "status", isProf ? user.id : "Open")
    .limit(1)

  const hasProjects = (projects ?? []).length > 0

  if (hasProjects) {
    // TODO: render project list
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Projects coming soon.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto w-full max-w-2xl px-6 pt-16 pb-10 flex-1 flex flex-col">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isProf ? "My Projects" : "Research Projects"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isProf
              ? "Manage your research projects and review student applications."
              : "Find research opportunities and apply to collaborate."}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center pb-40">
          <Empty className="max-w-md py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase />
              </EmptyMedia>
              <EmptyTitle>
                {isProf ? "No projects yet" : "No open projects"}
              </EmptyTitle>
              <EmptyDescription>
                {isProf
                  ? "Create your first research project to start recruiting student collaborators."
                  : "There are no open research projects right now. Check back soon or browse the feed for announcements."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {isProf ? (
                <div className="flex gap-2">
                  <Button className="rounded-full">
                    <Plus data-icon="inline-start" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="rounded-full" asChild>
                    <Link href="/feed">
                      <Search data-icon="inline-start" />
                      Browse Feed
                    </Link>
                  </Button>
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link href="/profiles">Find Professors</Link>
                  </Button>
                </div>
              )}
            </EmptyContent>
          </Empty>
        </div>

      </div>
    </div>
  )
}
