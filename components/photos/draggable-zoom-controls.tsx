"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, GripHorizontal, ChevronDown, ChevronUp } from "lucide-react"

interface DraggableZoomControlsProps {
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  minZoom?: number
  maxZoom?: number
}

export function DraggableZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  minZoom = 50,
  maxZoom = 200
}: DraggableZoomControlsProps) {
  const [position, setPosition] = useState({ x: 20, y: 140 })
  const [isDragging, setIsDragging] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const controlsRef = useRef<HTMLDivElement>(null)

  // Load saved position + collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zoom-controls-position-v2')
    if (saved) {
      try { setPosition(JSON.parse(saved)) } catch {}
    }
    const collapsed = localStorage.getItem('zoom-controls-collapsed')
    if (collapsed === 'true') setIsCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('zoom-controls-position-v2', JSON.stringify(position))
  }, [position])

  useEffect(() => {
    localStorage.setItem('zoom-controls-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    dragOffsetRef.current = {
      x: clientX - position.x,
      y: clientY - position.y
    }
  }, [position])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.drag-handle')) {
      e.preventDefault()
      handleDragStart(e.clientX, e.clientY)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.drag-handle')) {
      const touch = e.touches[0]
      handleDragStart(touch.clientX, touch.clientY)
    }
  }

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return
      const newX = Math.max(0, Math.min(clientX - dragOffsetRef.current.x, window.innerWidth - 60))
      const newY = Math.max(0, Math.min(clientY - dragOffsetRef.current.y, window.innerHeight - 60))
      setPosition({ x: newX, y: newY })
    }
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY)
    const handleEnd = () => setIsDragging(false)

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleEnd)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  return (
    <div
      ref={controlsRef}
      className={`fixed z-40 bg-white rounded-lg shadow-lg border ${
        isDragging ? 'cursor-grabbing shadow-xl' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="flex items-center">
        {/* Drag Handle */}
        <div
          className="drag-handle flex items-center justify-center py-2 px-1.5 cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded-l-lg"
          title="Drag to move"
        >
          <GripHorizontal className="h-3 w-3 text-gray-400" />
        </div>

        {isCollapsed ? (
          /* Collapsed: just show zoom level and expand button */
          <div className="flex items-center gap-1 pr-1">
            <span className="text-xs font-medium px-1.5 select-none">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(false) }}
              className="h-7 w-7 p-0"
              title="Expand zoom controls"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          /* Expanded: full controls */
          <div className="p-1.5 flex flex-row items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onZoomIn() }}
              disabled={zoomLevel >= maxZoom}
              title="Zoom in"
              className="h-7 w-7 p-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>

            <div className="text-center text-xs font-medium px-1 select-none whitespace-nowrap">
              {zoomLevel}%
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onZoomOut() }}
              disabled={zoomLevel <= minZoom}
              title="Zoom out"
              className="h-7 w-7 p-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onResetZoom() }}
              title="Reset zoom to 100%"
              className="h-7 w-7 p-0 text-xs"
            >
              1:1
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(true) }}
              className="h-7 w-7 p-0"
              title="Collapse zoom controls"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
