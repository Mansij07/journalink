"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface FollowedProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  /** The current user — suggestions come from accounts they follow. */
  currentUserId: string
  placeholder?: string
  rows?: number
  className?: string
  autoFocus?: boolean
}

export function MentionInput({
  value,
  onChange,
  currentUserId,
  placeholder,
  rows = 3,
  className,
  autoFocus,
}: MentionInputProps) {
  const [supabase] = React.useState(() => createClient())
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [followed, setFollowed] = React.useState<FollowedProfile[]>([])
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [tokenStart, setTokenStart] = React.useState(0)

  // Load the people the user follows once.
  React.useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    const load = async () => {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
      const ids = (follows ?? []).map((f) => f.following_id)
      if (ids.length === 0) return
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids)
      if (!cancelled) setFollowed((profiles as FollowedProfile[]) ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase, currentUserId])

  const suggestions = React.useMemo(() => {
    const q = query.toLowerCase()
    return followed
      .filter((p) => p.username && p.username.toLowerCase().startsWith(q))
      .slice(0, 6)
  }, [followed, query])

  const detectToken = (el: HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? el.value.length
    const before = el.value.slice(0, caret)
    const m = before.match(/@(\w*)$/)
    if (m) {
      setTokenStart(caret - m[0].length)
      setQuery(m[1])
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    detectToken(e.target)
  }

  const pick = (username: string) => {
    const el = ref.current
    const caret = el?.selectionStart ?? value.length
    const next = `${value.slice(0, tokenStart)}@${username} ${value.slice(caret)}`
    onChange(next)
    setOpen(false)
    // restore focus + caret after the inserted mention
    requestAnimationFrame(() => {
      if (!el) return
      const pos = tokenStart + username.length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      pick(suggestions[0].username!)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-popover p-1">
          {suggestions.map((p) => {
            const name = p.full_name || p.username || ""
            return (
              <button
                key={p.id}
                type="button"
                // onMouseDown (not onClick) so it fires before the textarea blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(p.username!)
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-muted"
                )}
              >
                <Avatar size="sm">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate text-foreground">@{p.username}</span>
                {p.full_name && (
                  <span className="truncate text-xs text-muted-foreground">{p.full_name}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
