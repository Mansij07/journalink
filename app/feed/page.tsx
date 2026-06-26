import { FeedClient } from "@/components/feed-page"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function feedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  return <FeedClient role={profile?.role || "Student"} userId={user.id} />
}