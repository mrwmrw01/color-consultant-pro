"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, GripHorizontal } from "lucide-react"

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
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const controlsRef = useRef<HTMLDivElement>(null)

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zoom-controls-position')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPosition(parsed)
      } catch (e) {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('zoom-controls-position', JSON.stringify(position))
  }, [position])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the drag handle area (top of the controls)
    const target = e.target as HTMLElement
    if (target.closest('.drag-handle')) {
      e.preventDefault()
      setIsDragging(true)

      if (controlsRef.current) {
        const rect = controlsRef.current.getBoundingClientRect()
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && controlsRef.current) {
        const parent = controlsRef.current.parentElement
        if (!parent) return

        const parentRect = parent.getBoundingClientRect()
        const controlsRect = controlsRef.current.getBoundingClientRect()

        // Calculate new position relative to parent
        let newX = e.clientX - parentRect.left - dragOffset.x
        let newY = e.clientY - parentRect.top - dragOffset.y

        // Keep within bounds
        newX = Math.max(0, Math.min(newX, parentRect.width - controlsRect.width))
        newY = Math.max(0, Math.min(newY, parentRect.height - controlsRect.height))

        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={controlsRef}
      className={`absolute z-50 bg-white rounded-lg shadow-lg border ${
        isDragging ? 'cursor-grabbing shadow-xl' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Drag Handle */}
      <div
        className="drag-handle flex items-center justify-center py-2 px-1 cursor-grab active:cursor-grabbing border-r hover:bg-gray-50 rounded-l-lg"
        title="Drag to move"
      >
        <GripHorizontal className="h-3 w-3 text-gray-400" />
      </div>

      {/* Zoom Controls */}
      <div className="p-2 flex flex-row items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onZoomIn()
          }}
          disabled={zoomLevel >= maxZoom}
          title="Zoom in"
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="text-center text-xs font-medium px-2 select-none whitespace-nowrap">
          {zoomLevel}%
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onZoomOut()
          }}
          disabled={zoomLevel <= minZoom}
          title="Zoom out"
          className="h-8 w-8 p-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onResetZoom()
          }}
          title="Reset zoom to 100%"
          className="h-8 w-8 p-0 text-xs"
        >
          1:1
        </Button>
      </div>
    </div>
  )
}
