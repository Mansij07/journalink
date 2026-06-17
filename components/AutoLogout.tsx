"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function AutoLogout() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let timer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await supabase.auth.signOut()
        router.push("/login")
      }, 10 * 60 * 1000) // 10 minutes
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart"]
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}