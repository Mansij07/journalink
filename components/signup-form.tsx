"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<"Student" | "Prof">("Student")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: username,
          full_name: username,
        },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setMessage("Check your email to confirm your account before logging in.")
      setLoading(false)
      return
    }

    if (data.user) {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Setup failed" }))
        setError(msg ?? "Setup failed")
        setLoading(false)
        return
      }
    }

    router.push("/feed")
    setLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="mansij07"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
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
              {message && <p className="text-sm text-green-500">{message}</p>}
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Sign up"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <a href="/login" className="underline underline-offset-4">
                    Login
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
