"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FeedTabsProps {
  activeTab: "all" | "following"
  setActiveTab: (tab: "all" | "following") => void
}

export function FeedTabs({ activeTab, setActiveTab }: FeedTabsProps) {
  const tabs = [
    { key: "all" as const, label: "All Posts" },
    { key: "following" as const, label: "Following" },
  ]

  return (
    <div className="flex border-b border-[#2F3336]">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={cn(
            "flex-1 py-4 text-[15px] relative transition-colors hover:bg-white/5",
            activeTab === key
              ? "font-bold text-white"
              : "font-medium text-[#71767B] hover:text-white"
          )}
        >
          {label}
          {activeTab === key && (
            <motion.div
              layoutId="feed-tab-underline"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-14 rounded-full bg-[#1D9BF0]"
            />
          )}
        </button>
      ))}
    </div>
  )
}
