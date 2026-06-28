"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOut } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

export function AppearanceAndAccount() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [supabase] = React.useState(() => createClient())
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Theme */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-sm text-muted-foreground">
            Switch between light, dark, or your system setting.
          </p>
        </div>
        <div
          className="inline-flex items-center rounded-lg border border-border p-0.5"
          role="group"
          aria-label="Theme"
        >
          {THEMES.map((t) => {
            const active = mounted && theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Logout */}
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
