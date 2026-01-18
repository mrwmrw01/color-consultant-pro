
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Camera, Loader2 } from "lucide-react"

interface PhotoImageProps {
  photoId: string
  alt: string
  className?: string
  aspectRatio?: "square" | "video" | "auto"
  sizes?: string
  priority?: boolean
  forceOriginal?: boolean
}

export function PhotoImage({ 
  photoId, 
  alt, 
  className = "", 
  aspectRatio = "auto",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  forceOriginal = false
}: PhotoImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const url = `/api/photos/${photoId}/url${forceOriginal ? '?original=true' : ''}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setImageUrl(data.url)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error("Failed to fetch image URL:", err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [photoId, forceOriginal])

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: ""
  }

  if (isLoading) {
    return (
      <div className={`${aspectClasses[aspectRatio]} bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div className={`${aspectClasses[aspectRatio]} bg-gray-100 flex items-center justify-center ${className}`}>
        <Camera className="h-8 w-8 text-gray-400" />
      </div>
    )
  }

  if (aspectRatio === "auto") {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className}
      />
    )
  }

  return (
    <div className={`relative ${aspectClasses[aspectRatio]} ${className}`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    </div>
  )
}
