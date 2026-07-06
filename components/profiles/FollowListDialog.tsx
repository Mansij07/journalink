"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Person {
  id: string
  username: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface FollowListDialogProps {
  userId: string
  type: "followers" | "following"
  count: number
  label: string
  /** True only when the viewer is looking at their own profile → show Remove. */
  isOwn: boolean
}

export function FollowListDialog({ userId, type, count, label, isOwn }: FollowListDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [people, setPeople] = React.useState<Person[]>([])
  const [query, setQuery] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  // Fetch (fresh) each time the dialog opens.
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setQuery("")
    fetch(`/api/follows/list?userId=${userId}&type=${type}`)
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((d) => {
        if (!cancelled) setPeople(d.people ?? [])
      })
      .catch(() => {
        if (!cancelled) setPeople([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, userId, type])

  const filtered = people.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      (p.full_name ?? "").toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q)
    )
  })

  async function remove(person: Person) {
    setPendingId(person.id)
    const prev = people
    setPeople((list) => list.filter((p) => p.id !== person.id)) // optimistic

    const res =
      type === "following"
        ? await fetch("/api/follows", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetId: person.id }),
          }).catch(() => null)
        : await fetch("/api/follows/remove-follower", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ followerId: person.id }),
          }).catch(() => null)

    setPendingId(null)
    if (!res || !res.ok) {
      setPeople(prev) // revert on failure
      return
    }
    router.refresh() // update the header counts (dialog stays open)
  }

  const emptyText = type === "followers" ? "No followers yet." : "Not following anyone yet."

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-foreground transition-colors hover:underline">
          <span className="font-semibold">{count}</span>{" "}
          <span className="text-muted-foreground">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <ScrollArea className="h-96 -mx-1">
          <div className="flex flex-col gap-1 px-1">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {people.length === 0 ? emptyText : "No matches."}
              </p>
            ) : (
              filtered.map((person) => {
                const displayName = person.full_name || person.username
                const initial = displayName.charAt(0).toUpperCase()
                return (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-accent"
                  >
                    <Link
                      href={`/profiles/${person.username}`}
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 items-center gap-2.5"
                    >
                      <Avatar size="sm">
                        {person.avatar_url && (
                          <AvatarImage src={person.avatar_url} alt={person.username} className="object-cover" />
                        )}
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
                      </div>
                    </Link>

                    {isOwn && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={pendingId === person.id}
                        onClick={() => remove(person)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
