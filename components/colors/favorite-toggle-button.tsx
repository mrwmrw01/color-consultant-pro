"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import toast from "react-hot-toast"

interface FavoriteToggleButtonProps {
  colorId: string
  initialFavorited?: boolean
  onToggle?: (favorited: boolean) => void
  className?: string
  size?: "sm" | "md" | "lg"
}

export function FavoriteToggleButton({
  colorId,
  initialFavorited = false,
  onToggle,
  className = "",
  size = "sm"
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)

    try {
      const response = await fetch('/api/colors/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorId })
      })

      if (response.ok) {
        const { favorited: newFavorited } = await response.json()
        setFavorited(newFavorited)
        toast.success(newFavorited ? 'Added to favorites' : 'Removed from favorites')
        onToggle?.(newFavorited)

        // Dispatch custom event for other components to update
        window.dispatchEvent(new Event('favoriteColorsUpdated'))
      } else if (response.status === 401) {
        toast.error('Please log in to favorite colors')
      } else {
        toast.error('Failed to update favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8 p-0',
    md: 'h-10 w-10 p-0',
    lg: 'h-12 w-12 p-0'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={`${sizeClasses[size]} ${className} transition-all`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`${iconSizes[size]} transition-all ${
          favorited
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-gray-400 hover:text-yellow-500 hover:fill-yellow-100'
        } ${loading ? 'animate-pulse' : ''}`}
      />
    </Button>
  )
}
