"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Username handle rule (mirrors the server): letters, numbers, underscores, 3–30 chars. */
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/

export default function OnboardingForm() {
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<"Student" | "Prof">("Student")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const usernameValid = USERNAME_RE.test(username.trim())

  const handleSubmit = async () => {
    if (!usernameValid) {
      setError("Username may only contain letters, numbers, and underscores (3–30 chars), no spaces.")
      return
    }

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
      body: JSON.stringify({ username: username.trim(), role }),
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
            <FieldLabel htmlFor="role">I am a...</FieldLabel>
            <Select value={role} onValueChange={(v) => setRole(v as "Student" | "Prof")}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Prof">Professor</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {error && <p className="text-sm text-error">{error}</p>}
          <Field>
            <Button onClick={handleSubmit} disabled={loading || !usernameValid}>
              {loading ? "Saving..." : "Get started"}
            </Button>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
