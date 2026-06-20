"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Image, Link as LinkIcon, FileText } from "lucide-react"

interface PostComposerProps {
  userId: string
  onPostCreated: () => void
}

export function PostComposer({ userId, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // For avatar, we can just use a generic 'P' or similar since we don't have the user object here.
  // We use 'P' for Prof.
  
  const handleSubmit = async () => {
    if (!content.trim()) return

    setLoading(true)
    setError(null)
    
    const { error: insertError } = await supabase
      .from('post')
      .insert({ content, author_id: userId, category: 'general' })

    if (insertError) {
      setError(insertError.message)
    } else {
      setContent("")
      onPostCreated()
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-white/10">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white">
        P
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <Textarea
          placeholder="What's happening on campus?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] border-none bg-transparent resize-none p-0 pt-2 pl-2 focus-visible:ring-0 text-lg text-[var(--foreground)]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-4 text-white/40">
            <Image className="size-5 cursor-pointer hover:text-white/70 transition-colors" />
            <LinkIcon className="size-5 cursor-pointer hover:text-white/70 transition-colors" />
            <FileText className="size-5 cursor-pointer hover:text-white/70 transition-colors" />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!content.trim() || loading}
            size="sm"
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  )
}
