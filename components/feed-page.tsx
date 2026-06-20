"use client"

import { FeedLayout } from "@/components/feed/FeedLayout"

interface FeedClientProps {
  role: string
  userId: string
}

export function FeedClient(props: FeedClientProps) {
  return <FeedLayout role={props.role} userId={props.userId} />
}