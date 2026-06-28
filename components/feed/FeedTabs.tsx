"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FeedTabsProps {
  activeTab: "all" | "following"
  setActiveTab: (tab: "all" | "following") => void
}

export function FeedTabs({ activeTab, setActiveTab }: FeedTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "all" | "following")}
    >
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 gap-0">
        <TabsTrigger
          value="all"
          className="flex-1 py-4 rounded-none text-[15px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-colors"
        >
          All Posts
        </TabsTrigger>
        <TabsTrigger
          value="following"
          className="flex-1 py-4 rounded-none text-[15px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-colors"
        >
          Following
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
