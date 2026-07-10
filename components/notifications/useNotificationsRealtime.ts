"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"

/**
 * Subscribe to the current user's notification changes over Supabase Realtime
 * (a WebSocket to Postgres). Fires `onChange` on every INSERT/UPDATE of a row
 * where `recipient_id` matches `userId`, so consumers can refetch. Realtime
 * delivery is gated by RLS, so this only ever receives the user's own rows.
 *
 * Requires the `notifications` table to be in the `supabase_realtime`
 * publication and a SELECT policy allowing `recipient_id = auth.uid()`.
 */
export function useNotificationsRealtime(userId: string, onChange: () => void) {
  // Keep the latest callback without re-subscribing on every render.
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    // Unique topic per hook instance: the browser client is a singleton, so a
    // shared topic (across the bell, the list, and Strict Mode's double-mount)
    // would reuse an already-subscribed channel and throw on `.on()`.
    const topic = `notifications:${userId}:${Math.random().toString(36).slice(2)}`

    // Apply the user's JWT to the socket so RLS lets the filtered rows through,
    // then open the channel. Re-applies on auth changes (e.g. token refresh).
    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }

      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          () => onChangeRef.current()
        )
        .subscribe()
    }

    setup()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])
}
