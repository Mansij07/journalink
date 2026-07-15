"use client"

import Image from "next/image"
import { Maximize2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MediaItem } from "./MediaViewer"

interface MediaCollageProps {
  items: MediaItem[]
  onOpen: (index: number) => void
}

function Tile({ item, onClick, className }: { item: MediaItem; onClick: () => void; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden cursor-pointer group bg-black", className)}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {item.type === "image" ? (
        <Image
          src={item.url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
          draggable={false}
        />
      ) : (
        <>
          <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-3 rounded-full bg-black/50">
              <Play className="size-5 text-white fill-white" />
            </div>
          </div>
        </>
      )}
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="size-3.5 text-white" />
      </div>
    </div>
  )
}

export function MediaCollage({ items, onOpen }: MediaCollageProps) {
  if (items.length === 0) return null

  const wrapper = "mt-1 mb-3 rounded-xl overflow-hidden border border-border w-fit max-w-full"

  if (items.length === 1) {
    const item = items[0]
    return (
      <div
        className={cn(wrapper, "relative group cursor-pointer")}
        onClick={(e) => { e.stopPropagation(); onOpen(0) }}
      >
        {item.type === "image" ? (
          <Image
            src={item.url}
            alt="Post attachment"
            width={1200}
            height={800}
            sizes="(max-width: 768px) 100vw, 600px"
            className="max-h-[420px] max-w-full w-auto object-contain block"
            style={{ width: "auto", height: "auto" }}
            draggable={false}
          />
        ) : (
          <video
            src={item.url}
            controls
            onClick={(e) => e.stopPropagation()}
            className="max-h-[420px] max-w-full w-auto block"
          />
        )}
        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="size-3.5 text-white" />
        </div>
      </div>
    )
  }

  if (items.length === 2) {
    return (
      <div className={cn(wrapper, "grid grid-cols-2 gap-0.5 h-[280px]")}>
        {items.map((item, i) => (
          <Tile key={i} item={item} onClick={() => onOpen(i)} className="h-full" />
        ))}
      </div>
    )
  }

  if (items.length === 3) {
    return (
      <div className={cn(wrapper, "grid grid-cols-2 grid-rows-2 gap-0.5 h-[320px]")}>
        <Tile item={items[0]} onClick={() => onOpen(0)} className="row-span-2 h-full" />
        <Tile item={items[1]} onClick={() => onOpen(1)} className="h-full" />
        <Tile item={items[2]} onClick={() => onOpen(2)} className="h-full" />
      </div>
    )
  }

  return (
    <div className={cn(wrapper, "grid grid-cols-2 grid-rows-2 gap-0.5 h-[320px]")}>
      {items.slice(0, 4).map((item, i) => (
        <Tile key={i} item={item} onClick={() => onOpen(i)} className="h-full" />
      ))}
    </div>
  )
}
