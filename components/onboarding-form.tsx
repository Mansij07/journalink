"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { error } = await supabase
      .from("profiles")
      .update({ username, role })
      .eq("id", user.id)

    if (error) {
      setError(error.message)
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="mansij07"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>I am a...</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="Student" checked={role === "Student"} onChange={() => setRole("Student")} />
                Student
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="Prof" checked={role === "Prof"} onChange={() => setRole("Prof")} />
                Professor
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading || !username}>
            {loading ? "Saving..." : "Get started"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}