"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, X } from "lucide-react"
import { getRecentColors, clearRecentColors, type RecentColor } from "@/lib/recent-colors"
import toast from "react-hot-toast"

interface RecentColorsPickerProps {
  onColorSelect: (colorId: string) => void
  selectedColorId?: string
  className?: string
}

export function RecentColorsPicker({
  onColorSelect,
  selectedColorId,
  className = ""
}: RecentColorsPickerProps) {
  const [recentColors, setRecentColors] = useState<RecentColor[]>([])

  // Load recent colors on mount and when localStorage changes
  useEffect(() => {
    const loadRecentColors = () => {
      setRecentColors(getRecentColors())
    }

    loadRecentColors()

    // Listen for storage changes (from other tabs/windows)
    window.addEventListener('storage', loadRecentColors)

    // Custom event for same-tab updates
    window.addEventListener('recentColorsUpdated', loadRecentColors)

    return () => {
      window.removeEventListener('storage', loadRecentColors)
      window.removeEventListener('recentColorsUpdated', loadRecentColors)
    }
  }, [])

  const handleClearAll = () => {
    clearRecentColors()
    setRecentColors([])
    toast.success("Recent colors cleared")
  }

  if (recentColors.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Recent Colors</span>
          <Badge variant="secondary" className="text-xs">
            {recentColors.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {recentColors.map((color) => (
          <button
            key={color.id}
            onClick={() => {
              onColorSelect(color.id)
              toast.success(`Selected: ${color.name}`)
            }}
            className={`
              group relative flex items-center gap-2 px-3 py-2 rounded-lg border-2
              transition-all duration-200 hover:shadow-md
              ${selectedColorId === color.id
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
            title={`${color.name} (${color.colorCode})`}
          >
            {/* Color swatch */}
            <div
              className="w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
              style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
            />

            {/* Color info */}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                {color.name}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {color.colorCode}
              </span>
            </div>

            {/* Selected indicator */}
            {selectedColorId === color.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 italic">
        Click a color chip for quick selection
      </p>
    </div>
  )
}
