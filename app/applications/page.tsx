import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Briefcase, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function ApplicationsPage() {
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto w-full max-w-2xl px-6 pt-16 pb-10 flex-1 flex flex-col">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isProf ? "Applications" : "My Applications"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isProf
              ? "Review applications from students interested in your projects."
              : "Track the status of projects you've applied to."}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center pb-40">
          <Empty className="max-w-md py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>
                {isProf ? "No applications yet" : "No applications yet"}
              </EmptyTitle>
              <EmptyDescription>
                {isProf
                  ? "Once students apply to your projects, their applications will appear here. Make sure your projects are open for applications."
                  : "You haven't applied to any research projects yet. Browse available projects and submit your first application."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {isProf ? (
                <div className="flex gap-2">
                  <Button className="rounded-full" asChild>
                    <Link href="/projects">
                      <Briefcase data-icon="inline-start" />
                      View My Projects
                    </Link>
                  </Button>
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link href="/feed">Post Announcement</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="rounded-full" asChild>
                    <Link href="/projects">
                      <Send data-icon="inline-start" />
                      Browse Projects
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
