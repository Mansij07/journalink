"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FeedTabsProps {
  activeTab: "all" | "following"
  setActiveTab: (tab: "all" | "following") => void
}

export function FeedTabs({ activeTab, setActiveTab }: FeedTabsProps) {
  return (
    <div className="flex border-b border-white/10 w-full">
      <div 
        className={cn(
          "flex-1 text-center py-3 text-sm font-medium cursor-pointer relative transition-colors",
          activeTab === "all" ? "text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
        )}
        onClick={() => setActiveTab("all")}
      >
        <span>All Posts</span>
        {activeTab === "all" && (
          <motion.div
            layoutId="feed-tab-underline"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-white mx-auto w-16"
          />
        )}
      </div>
      
      <div 
        className={cn(
          "flex-1 text-center py-3 text-sm font-medium cursor-pointer relative transition-colors",
          activeTab === "following" ? "text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
        )}
        onClick={() => setActiveTab("following")}
      >
        <span>Following</span>
        {activeTab === "following" && (
          <motion.div
            layoutId="feed-tab-underline"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-white mx-auto w-16"
          />
        )}
      </div>
    </div>
  )
}
