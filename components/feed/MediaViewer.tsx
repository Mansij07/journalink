"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"

export interface MediaItem {
  type: "image" | "video"
  url: string
}

interface MediaViewerProps {
  items: MediaItem[]
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function MediaViewer({ items, index, onClose, onIndexChange }: MediaViewerProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const offsetOriginRef = useRef({ x: 0, y: 0 })

  const isOpen = index !== null && index >= 0 && index < items.length
  const media = isOpen ? items[index] : null
  const hasMultiple = items.length > 1

  const goPrev = useCallback(() => {
    if (index === null) return
    onIndexChange((index - 1 + items.length) % items.length)
  }, [index, items.length, onIndexChange])

  const goNext = useCallback(() => {
    if (index === null) return
    onIndexChange((index + 1) % items.length)
  }, [index, items.length, onIndexChange])

  // Reset zoom/pan whenever the displayed item changes — adjusting state
  // during render (React's documented pattern for "resetting state when a
  // prop changes") instead of in an effect, so there's no flash of the
  // previous item's zoom/pan before it resets.
  const [prevIndex, setPrevIndex] = useState(index)
  if (index !== prevIndex) {
    setPrevIndex(index)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft" && hasMultiple) goPrev()
      else if (e.key === "ArrowRight" && hasMultiple) goNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, hasMultiple, onClose, goPrev, goNext])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setScale(prev => {
      const next = Math.min(Math.max(prev * factor, 1), 4)
      if (next <= 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    } else {
      setScale(2)
    }
  }, [scale])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragOriginRef.current = { x: e.clientX, y: e.clientY }
    offsetOriginRef.current = { ...offset }
  }, [scale, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setOffset({
      x: offsetOriginRef.current.x + (e.clientX - dragOriginRef.current.x),
      y: offsetOriginRef.current.y + (e.clientY - dragOriginRef.current.y),
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  if (!media) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="size-5" />
      </button>

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-white text-[14px] font-medium tabular-nums bg-black/60 rounded-full px-3 py-1">
          {index! + 1} / {items.length}
        </div>
      )}

      {/* Prev / Next */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Zoom controls — images only */}
      {media.type === "image" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-sm">
          <button
            onClick={() => setScale(prev => Math.min(prev * 1.3, 4))}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <span className="text-white text-[13px] tabular-nums w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => {
              const next = Math.max(prev / 1.3, 1)
              if (next <= 1) setOffset({ x: 0, y: 0 })
              return next
            })}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
          {scale > 1 && (
            <button
              onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="Reset zoom"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Media area */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={media.type === "image" ? handleWheel : undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {media.type === "image" ? (
          <img
            key={media.url}
            src={media.url}
            alt="Full view"
            draggable={false}
            onDoubleClick={handleDoubleClick}
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transition: isDragging ? "none" : "transform 0.15s ease",
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              userSelect: "none",
            }}
          />
        ) : (
          <video
            key={media.url}
            src={media.url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        )}
      </div>
    </div>
  )
}
