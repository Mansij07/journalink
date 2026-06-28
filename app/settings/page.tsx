import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import type { Profile } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm"
import { AppearanceAndAccount } from "@/components/settings/AppearanceAndAccount"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and preferences.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-[-0.01em] text-foreground">
            Profile
          </h2>
          <ProfileSettingsForm profile={profile as Profile} />
        </section>

        <Separator className="my-10" />

        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-[-0.01em] text-foreground">
            Appearance &amp; Account
          </h2>
          <AppearanceAndAccount />
        </section>
      </div>
    </div>
  )
}
