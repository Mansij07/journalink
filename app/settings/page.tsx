import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import type { Profile } from "@/lib/types"
import { getProfileById } from "@/lib/profile"
import { Separator } from "@/components/ui/separator"
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm"
import { AccountSettings } from "@/components/settings/AccountSettings"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfileById(supabase, user.id)

  if (!profile) redirect("/onboarding")

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-[-0.025em] text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-md text-muted-foreground">
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
            Account
          </h2>
          <AccountSettings />
        </section>
      </div>
    </div>
  )
}
