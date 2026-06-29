"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export default function OnboardingForm() {
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<"Student" | "Prof">("Student")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role }),
    })

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Update failed" }))
      setError(msg ?? "Update failed")
    } else {
      router.push("/feed")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">One last step!</CardTitle>
        <CardDescription>Tell us a bit about yourself</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              placeholder="mansij07"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>I am a...</FieldLabel>
            <ToggleGroup
              type="single"
              value={role}
              onValueChange={(v) => v && setRole(v as "Student" | "Prof")}
              spacing={0}
              className="w-full"
              variant="outline"
            >
              <ToggleGroupItem value="Student" className="flex-1">
                Student
              </ToggleGroupItem>
              <ToggleGroupItem value="Prof" className="flex-1">
                Professor
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Field>
            <Button onClick={handleSubmit} disabled={loading || !username}>
              {loading ? "Saving..." : "Get started"}
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
