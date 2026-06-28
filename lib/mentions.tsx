import * as React from "react"
import Link from "next/link"

const MENTION_RE = /@(\w+)/g

/**
 * Render post/comment text with `@username` tokens turned into links to the
 * mentioned user's profile. Plain text otherwise. Safe for client components.
 */
export function renderWithMentions(content: string | null | undefined): React.ReactNode {
  if (!content) return null

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  MENTION_RE.lastIndex = 0
  while ((match = MENTION_RE.exec(content)) !== null) {
    const [token, username] = match
    const start = match.index

    if (start > lastIndex) {
      nodes.push(content.slice(lastIndex, start))
    }

    nodes.push(
      <Link
        key={`m-${key++}`}
        href={`/profiles/${username}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-foreground hover:underline"
      >
        {token}
      </Link>
    )

    lastIndex = start + token.length
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex))
  }

  return nodes
}

/** Extract distinct lowercased usernames mentioned in a string. */
export function extractMentions(content: string): string[] {
  const found = new Set<string>()
  let match: RegExpExecArray | null
  MENTION_RE.lastIndex = 0
  while ((match = MENTION_RE.exec(content)) !== null) {
    found.add(match[1].toLowerCase())
  }
  return [...found]
}
