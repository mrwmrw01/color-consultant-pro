"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface FavoritesSectionProps {
  onColorSelect: (colorId: string) => void
  selectedColorId?: string
  className?: string
}

export function FavoritesSection({
  onColorSelect,
  selectedColorId,
  className = ""
}: FavoritesSectionProps) {
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/colors/favorite')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data)
      } else if (response.status === 401) {
        // User not logged in, silently fail
        setFavorites([])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()

    // Listen for favorite updates
    const handleFavoriteUpdate = () => loadFavorites()
    window.addEventListener('favoriteColorsUpdated', handleFavoriteUpdate)

    return () => {
      window.removeEventListener('favoriteColorsUpdated', handleFavoriteUpdate)
    }
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (favorites.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-xs font-medium text-gray-700">Favorite Colors</span>
        <Badge variant="secondary" className="text-xs">
          {favorites.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {favorites.map((color) => (
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
                ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
            title={`${color.name} (${color.colorCode}) - ${color.manufacturer}`}
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

            {/* Favorite star indicator */}
            <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 fill-yellow-500" />

            {/* Selected indicator */}
            {selectedColorId === color.id && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full border-2 border-white" />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 italic">
        Your favorite colors for quick access
      </p>
    </div>
  )
}
