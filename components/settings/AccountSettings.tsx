"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AccountSettings() {
  const router = useRouter()
  const [supabase] = React.useState(() => createClient())

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Log out</p>
          <p className="text-sm text-muted-foreground">
            Sign out of your Journalink account on this device.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut data-icon="inline-start" />
          Log out
        </Button>
      </div>
    </div>
  )
}
