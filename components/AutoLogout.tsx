"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function AutoLogout() {
  const router = useRouter()
  const supabase = createClient()
  const routerRef = useRef(router)
  const supabaseRef = useRef(supabase)

  useEffect(() => {
    let timer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await supabaseRef.current.auth.signOut()
        routerRef.current.push("/login")
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